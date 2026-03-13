import { PrismaService } from '../../prisma/prisma.service';

export interface ImportRowResult {
  status: 'IMPORTED' | 'SKIPPED_DUPLICATE' | 'ERROR';
  targetTable: string;
  targetId?: string;
  errorMessage?: string;
}

export async function handleClientRow(
  prisma: PrismaService,
  _tenantId: string,
  row: Record<string, string>,
): Promise<ImportRowResult> {
  const email = row['email']?.trim();
  const name = row['name']?.trim();

  if (!email || !name) {
    return {
      status: 'ERROR',
      targetTable: 'User',
      errorMessage: `Missing required fields: ${[!email && 'email', !name && 'name'].filter(Boolean).join(', ')}`,
    };
  }

  const existing = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return {
      status: 'SKIPPED_DUPLICATE',
      targetTable: 'User',
      targetId: existing.id,
      errorMessage: 'User with this email already exists',
    };
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      phone: row['phone']?.trim() || null,
    },
  });

  return {
    status: 'IMPORTED',
    targetTable: 'User',
    targetId: user.id,
  };
}
