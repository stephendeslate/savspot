import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotesService } from '@/notes/notes.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const AUTHOR_ID = 'author-001';
const OTHER_USER_ID = 'other-user-002';
const NOTE_ID = 'note-001';
const ENTITY_ID = 'booking-001';

function makePrisma() {
  return {
    note: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function makeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: NOTE_ID,
    tenantId: TENANT_ID,
    authorId: AUTHOR_ID,
    entityType: 'BOOKING',
    entityId: ENTITY_ID,
    body: 'Client arrived 10 minutes early',
    isPinned: false,
    createdAt: new Date('2026-03-01T10:00:00Z'),
    updatedAt: new Date('2026-03-01T10:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('NotesService', () => {
  let service: NotesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new NotesService(prisma as never);
  });

  // -----------------------------------------------------------------------
  // createNote
  // -----------------------------------------------------------------------

  describe('createNote', () => {
    it('should create a note with correct fields', async () => {
      const created = makeNote();
      prisma.note.create.mockResolvedValue(created);

      const result = await service.createNote(TENANT_ID, AUTHOR_ID, {
        entityType: 'BOOKING',
        entityId: ENTITY_ID,
        body: 'Client arrived 10 minutes early',
      });

      expect(prisma.note.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          authorId: AUTHOR_ID,
          entityType: 'BOOKING',
          entityId: ENTITY_ID,
          body: 'Client arrived 10 minutes early',
        },
      });
      expect(result.id).toBe(NOTE_ID);
      expect(result.entityType).toBe('BOOKING');
      expect(result.body).toBe('Client arrived 10 minutes early');
    });

    it('should create a note for CLIENT entity type', async () => {
      const created = makeNote({ entityType: 'CLIENT', entityId: 'client-001' });
      prisma.note.create.mockResolvedValue(created);

      const result = await service.createNote(TENANT_ID, AUTHOR_ID, {
        entityType: 'CLIENT',
        entityId: 'client-001',
        body: 'VIP customer',
      });

      expect(prisma.note.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'CLIENT',
          entityId: 'client-001',
        }),
      });
      expect(result.entityType).toBe('CLIENT');
    });
  });

  // -----------------------------------------------------------------------
  // listNotes
  // -----------------------------------------------------------------------

  describe('listNotes', () => {
    it('should return filtered results for entity', async () => {
      const notes = [makeNote(), makeNote({ id: 'note-002', body: 'Follow up needed' })];
      prisma.note.findMany.mockResolvedValue(notes);

      const result = await service.listNotes(TENANT_ID, 'BOOKING', ENTITY_ID);

      expect(prisma.note.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          entityType: 'BOOKING',
          entityId: ENTITY_ID,
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      });
      expect(result).toHaveLength(2);
    });

    it('should order by pinned first then createdAt desc', async () => {
      const pinnedNote = makeNote({
        id: 'note-pinned',
        isPinned: true,
        createdAt: new Date('2026-02-01T10:00:00Z'),
      });
      const recentNote = makeNote({
        id: 'note-recent',
        isPinned: false,
        createdAt: new Date('2026-03-03T10:00:00Z'),
      });
      const oldNote = makeNote({
        id: 'note-old',
        isPinned: false,
        createdAt: new Date('2026-01-01T10:00:00Z'),
      });

      // Prisma returns in the correct order
      prisma.note.findMany.mockResolvedValue([pinnedNote, recentNote, oldNote]);

      const result = await service.listNotes(TENANT_ID, 'BOOKING', ENTITY_ID);

      // Verify the orderBy was passed correctly
      expect(prisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        }),
      );
      expect(result[0]!.id).toBe('note-pinned');
      expect(result[1]!.id).toBe('note-recent');
      expect(result[2]!.id).toBe('note-old');
    });

    it('should return empty array when no notes exist', async () => {
      prisma.note.findMany.mockResolvedValue([]);

      const result = await service.listNotes(TENANT_ID, 'BOOKING', ENTITY_ID);

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // updateNote
  // -----------------------------------------------------------------------

  describe('updateNote', () => {
    it('should update note body', async () => {
      const existing = makeNote();
      const updated = makeNote({ body: 'Updated body' });

      prisma.note.findFirst.mockResolvedValue(existing);
      prisma.note.update.mockResolvedValue(updated);

      const result = await service.updateNote(TENANT_ID, NOTE_ID, AUTHOR_ID, {
        body: 'Updated body',
      });

      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: NOTE_ID },
        data: { body: 'Updated body' },
      });
      expect(result.body).toBe('Updated body');
    });

    it('should reject non-author', async () => {
      const existing = makeNote();
      prisma.note.findFirst.mockResolvedValue(existing);

      await expect(
        service.updateNote(TENANT_ID, NOTE_ID, OTHER_USER_ID, {
          body: 'Hijacked note',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.note.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when note does not exist', async () => {
      prisma.note.findFirst.mockResolvedValue(null);

      await expect(
        service.updateNote(TENANT_ID, 'nonexistent', AUTHOR_ID, {
          body: 'Does not matter',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // deleteNote
  // -----------------------------------------------------------------------

  describe('deleteNote', () => {
    it('should delete note and return confirmation', async () => {
      const existing = makeNote();
      prisma.note.findFirst.mockResolvedValue(existing);
      prisma.note.delete.mockResolvedValue(existing);

      const result = await service.deleteNote(TENANT_ID, NOTE_ID, AUTHOR_ID);

      expect(prisma.note.delete).toHaveBeenCalledWith({
        where: { id: NOTE_ID },
      });
      expect(result).toEqual({ deleted: true });
    });

    it('should reject non-author', async () => {
      const existing = makeNote();
      prisma.note.findFirst.mockResolvedValue(existing);

      await expect(
        service.deleteNote(TENANT_ID, NOTE_ID, OTHER_USER_ID),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.note.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when note does not exist', async () => {
      prisma.note.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteNote(TENANT_ID, 'nonexistent', AUTHOR_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // togglePin
  // -----------------------------------------------------------------------

  describe('togglePin', () => {
    it('should flip isPinned from false to true', async () => {
      const existing = makeNote({ isPinned: false });
      const updated = makeNote({ isPinned: true });

      prisma.note.findFirst.mockResolvedValue(existing);
      prisma.note.update.mockResolvedValue(updated);

      const result = await service.togglePin(TENANT_ID, NOTE_ID);

      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: NOTE_ID },
        data: { isPinned: true },
      });
      expect(result.isPinned).toBe(true);
    });

    it('should flip isPinned from true to false', async () => {
      const existing = makeNote({ isPinned: true });
      const updated = makeNote({ isPinned: false });

      prisma.note.findFirst.mockResolvedValue(existing);
      prisma.note.update.mockResolvedValue(updated);

      const result = await service.togglePin(TENANT_ID, NOTE_ID);

      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: NOTE_ID },
        data: { isPinned: false },
      });
      expect(result.isPinned).toBe(false);
    });

    it('should throw NotFoundException when note does not exist', async () => {
      prisma.note.findFirst.mockResolvedValue(null);

      await expect(
        service.togglePin(TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
