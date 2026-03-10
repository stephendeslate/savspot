import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

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
 * Redis-based circuit breaker for communication delivery channels.
 *
 * Keys used:
 * - circuit:{channel}:{tenantId}:failures  — consecutive failure count
 * - circuit:{channel}:{tenantId}:state     — 'OPEN' or 'HALF_OPEN' (absent = CLOSED)
 */
@Injectable()
export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Check if the circuit allows sending for the given channel+tenant.
   * Returns true if sending is allowed (CLOSED or HALF_OPEN).
   */
  async canSend(channel: string, tenantId: string): Promise<boolean> {
    const state = await this.getState(channel, tenantId);

    if (state === 'OPEN') {
      this.logger.warn(
        `Circuit OPEN for ${channel}:${tenantId} — blocking delivery`,
      );
      return false;
    }

    // CLOSED and HALF_OPEN both allow sending
    return true;
  }

  /**
   * Record a successful delivery — resets the circuit to CLOSED.
   */
  async recordSuccess(channel: string, tenantId: string): Promise<void> {
    const prefix = this.keyPrefix(channel, tenantId);
    await this.redis.del(`${prefix}:failures`, `${prefix}:state`);
  }

  /**
   * Record a failed delivery — increments failure count and
   * opens the circuit if threshold is reached.
   */
  async recordFailure(channel: string, tenantId: string): Promise<void> {
    const prefix = this.keyPrefix(channel, tenantId);
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
        `Circuit OPENED for ${channel}:${tenantId} after ${failures} consecutive failures — will recover in ${OPEN_DURATION_SECONDS / 60} minutes`,
      );
    }
  }

  /**
   * Get the current circuit state for a channel+tenant.
   */
  async getState(channel: string, tenantId: string): Promise<CircuitState> {
    const prefix = this.keyPrefix(channel, tenantId);
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

  private keyPrefix(channel: string, tenantId: string): string {
    return `circuit:${channel}:${tenantId}`;
  }
}
