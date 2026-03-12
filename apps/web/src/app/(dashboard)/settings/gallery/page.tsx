'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface GalleryPhoto {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  altText: string | null;
  caption: string | null;
  category: string | null;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
}

interface PhotoFormData {
  url: string;
  altText: string;
  caption: string;
  category: string;
  isFeatured: boolean;
  sortOrder: string;
}

const EMPTY_FORM: PhotoFormData = {
  url: '',
  altText: '',
  caption: '',
  category: '',
  isFeatured: false,
  sortOrder: '0',
};

// ---------- Component ----------

export default function GalleryPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null);
  const [formData, setFormData] = useState<PhotoFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<GalleryPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await apiClient.get<GalleryPhoto[]>(
        `/api/tenants/${tenantId}/gallery`,
      );
      setPhotos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load gallery',
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchPhotos();
  }, [tenantId, fetchPhotos]);

  const openCreateDialog = () => {
    setEditingPhoto(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (photo: GalleryPhoto) => {
    setEditingPhoto(photo);
    setFormData({
      url: photo.url,
      altText: photo.altText || '',
      caption: photo.caption || '',
      category: photo.category || '',
      isFeatured: photo.isFeatured,
      sortOrder: photo.sortOrder.toString(),
    });
    setFormError(null);
    setOpenActionId(null);
    setDialogOpen(true);
  };

  const updateField = <K extends keyof PhotoFormData>(
    field: K,
    value: PhotoFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitForm = async () => {
    if (!tenantId) return;
    setFormError(null);

    if (!formData.url.trim()) {
      setFormError('Image URL is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        url: formData.url.trim(),
        altText: formData.altText.trim() || undefined,
        caption: formData.caption.trim() || undefined,
        category: formData.category.trim() || undefined,
        isFeatured: formData.isFeatured,
        sortOrder: parseInt(formData.sortOrder, 10) || 0,
      };

      if (editingPhoto) {
        await apiClient.patch(
          `/api/tenants/${tenantId}/gallery/${editingPhoto.id}`,
          payload,
        );
        setSuccess('Photo updated');
      } else {
        await apiClient.post(`/api/tenants/${tenantId}/gallery`, payload);
        setSuccess('Photo added');
      }

      setDialogOpen(false);
      await fetchPhotos();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save photo',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tenantId || !deletingPhoto) return;
    setDeleting(true);
    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/gallery/${deletingPhoto.id}`,
      );
      setDeleteDialogOpen(false);
      setDeletingPhoto(null);
      setSuccess('Photo deleted');
      await fetchPhotos();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete photo',
      );
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!openActionId) return;
    const handleClick = () => setOpenActionId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openActionId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-medium">No business found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Please complete onboarding to set up your business.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(ROUTES.SETTINGS)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Gallery</h2>
            <p className="text-sm text-muted-foreground">
              Manage photos displayed on your booking page
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Photo
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {photos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No photos yet. Add photos to showcase your work.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={openCreateDialog}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Photo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="group relative overflow-hidden">
              <div className="relative aspect-square">
                <Image
                  src={photo.thumbnailUrl || photo.url}
                  alt={photo.altText || photo.caption || 'Gallery photo'}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              {photo.isFeatured && (
                <Badge className="absolute left-2 top-2 bg-yellow-100 text-yellow-800">
                  <Star className="mr-1 h-3 w-3" />
                  Featured
                </Badge>
              )}
              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenActionId(
                        openActionId === photo.id ? null : photo.id,
                      );
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  {openActionId === photo.id && (
                    <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-md border bg-background py-1 shadow-md">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => openEditDialog(photo)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                        onClick={() => {
                          setDeletingPhoto(photo);
                          setDeleteDialogOpen(true);
                          setOpenActionId(null);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {(photo.caption || photo.category) && (
                <CardContent className="p-2">
                  {photo.caption && (
                    <p className="text-xs text-foreground truncate">{photo.caption}</p>
                  )}
                  {photo.category && (
                    <p className="text-xs text-muted-foreground">{photo.category}</p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPhoto ? 'Edit Photo' : 'Add Photo'}
            </DialogTitle>
            <DialogDescription>
              {editingPhoto
                ? 'Update photo details'
                : 'Add a new photo to your gallery'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="photo-url">Image URL</Label>
              <Input
                id="photo-url"
                value={formData.url}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder="https://..."
                disabled={!!editingPhoto}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo-alt">Alt Text</Label>
              <Input
                id="photo-alt"
                value={formData.altText}
                onChange={(e) => updateField('altText', e.target.value)}
                placeholder="Describe the image"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo-caption">Caption</Label>
              <Input
                id="photo-caption"
                value={formData.caption}
                onChange={(e) => updateField('caption', e.target.value)}
                placeholder="Optional caption"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="photo-category">Category</Label>
                <Input
                  id="photo-category"
                  value={formData.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  placeholder="e.g. Interior"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo-sort">Sort Order</Label>
                <Input
                  id="photo-sort"
                  type="number"
                  min="0"
                  value={formData.sortOrder}
                  onChange={(e) => updateField('sortOrder', e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => updateField('isFeatured', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Featured photo
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitForm} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingPhoto ? 'Updating...' : 'Adding...'}
                </>
              ) : editingPhoto ? (
                'Update'
              ) : (
                'Add Photo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Photo</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this photo? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingPhoto(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
