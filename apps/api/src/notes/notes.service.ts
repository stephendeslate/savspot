import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { NoteEntityType } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { clampPageSize } from '../common/utils/pagination';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

const AUTHOR_INCLUDE = {
  author: { select: { id: true, name: true, avatarUrl: true } },
} as const;

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a note attached to an entity (booking or client).
   */
  async createNote(tenantId: string, authorId: string, dto: CreateNoteDto) {
    const note = await this.prisma.note.create({
      data: {
        tenantId,
        authorId,
        entityType: dto.entityType as NoteEntityType,
        entityId: dto.entityId,
        body: dto.body,
      },
      include: AUTHOR_INCLUDE,
    });

    this.logger.log(
      `Note ${note.id} created for ${dto.entityType} ${dto.entityId} by ${authorId}`,
    );

    return note;
  }

  /**
   * List notes for a specific entity, ordered by isPinned desc, createdAt desc.
   */
  async listNotes(
    tenantId: string,
    entityType: NoteEntityType,
    entityId: string,
  ) {
    return this.prisma.note.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
      },
      include: AUTHOR_INCLUDE,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Update a note's body. Only the original author may update.
   */
  async updateNote(
    tenantId: string,
    noteId: string,
    authorId: string,
    dto: UpdateNoteDto,
  ) {
    const existing = await this.prisma.note.findFirst({
      where: { id: noteId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    if (existing.authorId !== authorId) {
      throw new ForbiddenException('Only the note author can update this note');
    }

    const updated = await this.prisma.note.update({
      where: { id: noteId },
      data: { body: dto.body },
      include: AUTHOR_INCLUDE,
    });

    this.logger.log(`Note ${noteId} updated by ${authorId}`);

    return updated;
  }

  /**
   * Delete a note. Only the original author may delete.
   */
  async deleteNote(tenantId: string, noteId: string, authorId: string) {
    const existing = await this.prisma.note.findFirst({
      where: { id: noteId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    if (existing.authorId !== authorId) {
      throw new ForbiddenException('Only the note author can delete this note');
    }

    await this.prisma.note.delete({
      where: { id: noteId },
    });

    this.logger.log(`Note ${noteId} deleted by ${authorId}`);

    return { deleted: true };
  }

  /**
   * Toggle the isPinned status of a note.
   */
  async togglePin(tenantId: string, noteId: string) {
    const existing = await this.prisma.note.findFirst({
      where: { id: noteId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    const updated = await this.prisma.note.update({
      where: { id: noteId },
      data: { isPinned: !existing.isPinned },
      include: AUTHOR_INCLUDE,
    });

    this.logger.log(
      `Note ${noteId} pin toggled to ${updated.isPinned}`,
    );

    return updated;
  }

  /**
   * Return a paginated timeline of all notes for a tenant, newest first.
   */
  async getTimeline(tenantId: string, page: number, limit: number) {
    const pageSize = clampPageSize(limit);
    const skip = (Math.max(1, page) - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.note.findMany({
        where: { tenantId },
        include: AUTHOR_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.note.count({ where: { tenantId } }),
    ]);

    return { data, total, page: Math.max(1, page), pageSize };
  }
}
