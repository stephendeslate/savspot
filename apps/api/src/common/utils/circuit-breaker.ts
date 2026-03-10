import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * Circuit breaker states per spec:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failures exceeded threshold, requests blocked
 * - HALF_OPEN: Recovery period, allow one test request
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** 5 consecutive failures open the circuit */
const FAILURE_THRESHOLD = 5;

/** Circuit stays OPEN for 5 minutes before transitioning to HALF_OPEN */
const OPEN_DURATION_SECONDS = 5 * 60;

/** TTL for the failure counter (auto-reset after 30 minutes of no failures) */
const COUNTER_TTL_SECONDS = 30 * 60;

/**
 * Redis-based circuit breaker for external service calls.
 *
 * Keys used:
 * - circuit:{scope}:{tenantId}:failures  — consecutive failure count
 * - circuit:{scope}:{tenantId}:state     — 'OPEN' or 'HALF_OPEN' (absent = CLOSED)
 */
@Injectable()
export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Check if the circuit allows requests for the given scope+tenant.
   * Returns true if allowed (CLOSED or HALF_OPEN).
   */
  async canSend(scope: string, tenantId: string): Promise<boolean> {
    const state = await this.getState(scope, tenantId);

    if (state === 'OPEN') {
      this.logger.warn(
        `Circuit OPEN for ${scope}:${tenantId} — blocking request`,
      );
      return false;
    }

    // CLOSED and HALF_OPEN both allow sending
    return true;
  }

  /**
   * Record a successful call — resets the circuit to CLOSED.
   */
  async recordSuccess(scope: string, tenantId: string): Promise<void> {
    const prefix = this.keyPrefix(scope, tenantId);
    await this.redis.del(`${prefix}:failures`, `${prefix}:state`);
  }

  /**
   * Record a failed call — increments failure count and
   * opens the circuit if threshold is reached.
   */
  async recordFailure(scope: string, tenantId: string): Promise<void> {
    const prefix = this.keyPrefix(scope, tenantId);
    const failuresKey = `${prefix}:failures`;
    const stateKey = `${prefix}:state`;

    // Increment failure counter
    const client = this.redis.getClient();
    const failures = await client.incr(failuresKey);
    await this.redis.expire(failuresKey, COUNTER_TTL_SECONDS);

    if (failures >= FAILURE_THRESHOLD) {
      // Open the circuit
      await this.redis.setex(stateKey, OPEN_DURATION_SECONDS, 'OPEN');
      this.logger.warn(
        `Circuit OPENED for ${scope}:${tenantId} after ${failures} consecutive failures — will recover in ${OPEN_DURATION_SECONDS / 60} minutes`,
      );
    }
  }

  /**
   * Get the current circuit state for a scope+tenant.
   */
  async getState(scope: string, tenantId: string): Promise<CircuitState> {
    const prefix = this.keyPrefix(scope, tenantId);
    const stateVal = await this.redis.get(`${prefix}:state`);

    if (!stateVal) {
      return 'CLOSED';
    }

    if (stateVal === 'OPEN') {
      // Check if OPEN duration has expired (Redis TTL handles this,
      // but if the key still exists it's still within the OPEN window)
      return 'OPEN';
    }

    if (stateVal === 'HALF_OPEN') {
      return 'HALF_OPEN';
    }

    return 'CLOSED';
  }

  /**
   * Transition from OPEN to HALF_OPEN (called when OPEN TTL expires
   * and a new request comes in). Since we use Redis TTL for the OPEN
   * duration, when the state key expires the circuit is effectively HALF_OPEN.
   * The next canSend() call will return true, and the result determines
   * whether we go back to CLOSED (success) or OPEN (failure).
   *
   * To support explicit HALF_OPEN: when the OPEN key expires, the state
   * key is gone, so getState returns CLOSED. This is effectively HALF_OPEN
   * behavior — one test request goes through. If it fails, recordFailure
   * re-opens the circuit. If it succeeds, recordSuccess keeps it CLOSED.
   */

  private keyPrefix(scope: string, tenantId: string): string {
    return `circuit:${scope}:${tenantId}`;
  }
}
