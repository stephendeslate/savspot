'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, StickyNote } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { NoteCard, type NoteData } from './note-card';
import { CreateNoteForm } from './create-note-form';

interface NotesPanelProps {
  entityType: 'BOOKING' | 'CLIENT';
  entityId: string;
  tenantId: string;
}

export function NotesPanel({ entityType, entityId, tenantId }: NotesPanelProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!tenantId || !entityId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<NoteData[]>(
        `/api/tenants/${tenantId}/notes?entityType=${entityType}&entityId=${entityId}`,
      );
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, entityType, entityId]);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  const sortedNotes = [...notes].sort((a, b) => {
    // Pinned notes first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // Then by date descending
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleCreateNote = async (body: string) => {
    await apiClient.post(`/api/tenants/${tenantId}/notes`, {
      entityType,
      entityId,
      body,
    });
    await fetchNotes();
  };

  const handlePin = async (noteId: string, pinned: boolean) => {
    await apiClient.patch(`/api/tenants/${tenantId}/notes/${noteId}/pin`, { pinned });
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, pinned } : n)),
    );
  };

  const handleEdit = async (noteId: string, body: string) => {
    await apiClient.patch(`/api/tenants/${tenantId}/notes/${noteId}`, { body });
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, body, updatedAt: new Date().toISOString() } : n,
      ),
    );
  };

  const handleDelete = async (noteId: string) => {
    await apiClient.del(`/api/tenants/${tenantId}/notes/${noteId}`);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            <span className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Notes
              {notes.length > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {notes.length}
                </span>
              )}
            </span>
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-4">
          <CreateNoteForm onSubmit={handleCreateNote} />

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : sortedNotes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No notes yet. Add one above.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  currentUserId={user?.id ?? ''}
                  onPin={handlePin}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
