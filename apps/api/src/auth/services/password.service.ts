import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
