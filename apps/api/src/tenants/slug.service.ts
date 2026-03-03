import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SlugService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a unique slug from a business name.
   *
   * Converts to lowercase, replaces spaces/underscores with hyphens,
   * strips non-alphanumeric characters (except hyphens), collapses
   * consecutive hyphens, and trims leading/trailing hyphens.
   *
   * If the slug already exists, appends -2, -3, etc.
   */
  async generateSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Ensure we have something to work with
    const slug = base || 'tenant';

    // Check if the base slug is available
    const existing = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    // Find the next available suffix
    let suffix = 2;
    while (true) {
      const candidate = `${slug}-${suffix}`;
      const taken = await this.prisma.tenant.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!taken) {
        return candidate;
      }

      suffix++;
    }
  }
}
