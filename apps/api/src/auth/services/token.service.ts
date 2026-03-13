import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../../redis/redis.service';

export interface JwtPayload {
  sub: string;
  email: string;
  platformRole: string;
  tenantId?: string;
  tenantRole?: string;
}

interface SignedToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

const BLACKLIST_PREFIX = 'token:blacklist:';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const privateKeyB64 = this.configService.get<string>('JWT_PRIVATE_KEY_BASE64');
    const publicKeyB64 = this.configService.get<string>('JWT_PUBLIC_KEY_BASE64');

    if (privateKeyB64 && publicKeyB64) {
      this.privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8');
      this.publicKey = Buffer.from(publicKeyB64, 'base64').toString('utf8');
    } else {
      this.logger.warn(
        'JWT keys not provided — generating ephemeral RSA keypair (development only)',
      );
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      this.privateKey = privateKey;
      this.publicKey = publicKey;
    }

    this.accessExpiry = this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m');
    this.refreshExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d');
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  generateAccessToken(payload: JwtPayload): SignedToken {
    const jti = uuidv4();
    const token = jwt.sign({ ...payload, jti, type: 'access' }, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.accessExpiry as unknown as number,
    } as jwt.SignOptions);
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    return {
      token,
      jti,
      expiresAt: new Date((decoded.exp as number) * 1000),
    };
  }

  generateRefreshToken(payload: JwtPayload): SignedToken {
    const jti = uuidv4();
    const token = jwt.sign({ ...payload, jti, type: 'refresh' }, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.refreshExpiry as unknown as number,
    } as jwt.SignOptions);
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    return {
      token,
      jti,
      expiresAt: new Date((decoded.exp as number) * 1000),
    };
  }

  verifyToken(token: string): JwtPayload & { jti: string; type?: string; exp: number } {
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
    }) as JwtPayload & { jti: string; type?: string; exp: number };
  }

  async blacklistToken(jti: string, expiresAt: Date): Promise<void> {
    const ttl = Math.max(
      Math.ceil((expiresAt.getTime() - Date.now()) / 1000),
      1,
    );
    await this.redisService.setex(`${BLACKLIST_PREFIX}${jti}`, ttl, '1');
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redisService.exists(`${BLACKLIST_PREFIX}${jti}`);
    return result > 0;
  }
}
