import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { NoteEntityType } from '../../../../prisma/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

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
    });

    this.logger.log(
      `Note ${noteId} pin toggled to ${updated.isPinned}`,
    );

    return updated;
  }
}
