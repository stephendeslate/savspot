'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Check, Loader2, Pencil, Pin, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface NoteData {
  id: string;
  body: string;
  pinned: boolean;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

interface NoteCardProps {
  note: NoteData;
  currentUserId: string;
  onPin: (noteId: string, pinned: boolean) => Promise<void>;
  onEdit: (noteId: string, body: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
}

export function NoteCard({ note, currentUserId, onPin, onEdit, onDelete }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(note.body);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = note.authorId === currentUserId;

  const handlePin = async () => {
    setIsPinning(true);
    try {
      await onPin(note.id, !note.pinned);
    } finally {
      setIsPinning(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editBody.trim()) return;
    setIsSaving(true);
    try {
      await onEdit(note.id, editBody.trim());
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(note.id);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleCancelEdit = () => {
    setEditBody(note.body);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        'rounded-md border p-3',
        note.pinned && 'border-primary/30 bg-primary/5',
      )}
    >
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={3}
            disabled={isSaving}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => void handleSaveEdit()}
              disabled={!editBody.trim() || isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Check className="mr-1 h-3 w-3" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelEdit}
              disabled={isSaving}
            >
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm">{note.body}</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {note.authorName} &middot;{' '}
              {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
              {note.updatedAt !== note.createdAt && ' (edited)'}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handlePin()}
                disabled={isPinning}
                className="h-7 w-7 p-0"
                aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
              >
                {isPinning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Pin
                    className={cn(
                      'h-3.5 w-3.5',
                      note.pinned && 'fill-primary text-primary',
                    )}
                  />
                )}
              </Button>
              {isOwner && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditBody(note.body);
                      setIsEditing(true);
                    }}
                    className="h-7 w-7 p-0"
                    aria-label="Edit note"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {confirmDelete ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete()}
                        disabled={isDeleting}
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Delete'
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete(false)}
                        className="h-7 px-2 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(true)}
                      className="h-7 w-7 p-0"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
