'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  serviceCount: number;
  createdAt: string;
}

interface CategoryFormData {
  name: string;
  description: string;
  sortOrder: string;
}

const EMPTY_FORM: CategoryFormData = {
  name: '',
  description: '',
  sortOrder: '',
};

// ---------- Helpers ----------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------- Component ----------

export default function ServiceCategoriesPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<ServiceCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await apiClient.get<ServiceCategory[]>(
        `/api/tenants/${tenantId}/service-categories`,
      );
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load service categories',
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
    void fetchCategories();
  }, [tenantId, fetchCategories]);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormData({
      ...EMPTY_FORM,
      sortOrder: String(categories.length + 1),
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (category: ServiceCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      sortOrder: category.sortOrder.toString(),
    });
    setFormError(null);
    setOpenActionId(null);
    setDialogOpen(true);
  };

  const updateField = <K extends keyof CategoryFormData>(
    field: K,
    value: CategoryFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitForm = async () => {
    if (!tenantId) return;
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }

    const sortOrder = parseInt(formData.sortOrder, 10);
    if (formData.sortOrder && (isNaN(sortOrder) || sortOrder < 0)) {
      setFormError('Sort order must be a non-negative number');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        sortOrder: formData.sortOrder ? sortOrder : undefined,
      };

      if (editingCategory) {
        await apiClient.patch(
          `/api/tenants/${tenantId}/service-categories/${editingCategory.id}`,
          payload,
        );
        setSuccess('Category updated');
      } else {
        await apiClient.post(
          `/api/tenants/${tenantId}/service-categories`,
          payload,
        );
        setSuccess('Category created');
      }

      setDialogOpen(false);
      await fetchCategories();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save category',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tenantId || !deletingCategory) return;
    setDeleting(true);
    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/service-categories/${deletingCategory.id}`,
      );
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      setSuccess('Category deleted');
      await fetchCategories();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete category',
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

  // ---------- Loading ----------

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
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
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

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <h2 className="text-lg font-semibold">Service Categories</h2>
            <p className="text-sm text-muted-foreground">
              Organize services into categories
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categories</CardTitle>
          <CardDescription>
            {categories.length === 0
              ? 'No categories created yet. Create one to organize your services.'
              : `${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'} total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Create your first category to get started
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.description || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {category.serviceCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {category.sortOrder}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(category.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionId(
                              openActionId === category.id
                                ? null
                                : category.id,
                            );
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        {openActionId === category.id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border bg-background py-1 shadow-md">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                              onClick={() => openEditDialog(category)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                              onClick={() => {
                                setDeletingCategory(category);
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category details'
                : 'Create a new service category'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Hair Services"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-description">
                Description (optional)
              </Label>
              <Input
                id="category-description"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="e.g. Cuts, coloring, and styling"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-sort-order">Sort Order</Label>
              <Input
                id="category-sort-order"
                type="number"
                min="0"
                value={formData.sortOrder}
                onChange={(e) => updateField('sortOrder', e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
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
                  {editingCategory ? 'Updating...' : 'Creating...'}
                </>
              ) : editingCategory ? (
                'Update'
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {deletingCategory?.name}
              </span>
              ?{' '}
              {deletingCategory && deletingCategory.serviceCount > 0
                ? `This category has ${deletingCategory.serviceCount} service${deletingCategory.serviceCount !== 1 ? 's' : ''} assigned. They will become uncategorized.`
                : 'This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingCategory(null);
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
