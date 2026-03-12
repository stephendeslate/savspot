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
  Zap,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface WorkflowAction {
  type: string;
  config: Record<string, unknown>;
}

interface Workflow {
  id: string;
  name: string;
  triggerEvent: string;
  actions: WorkflowAction[];
  active: boolean;
  createdAt: string;
  lastTriggeredAt: string | null;
}

interface WorkflowFormData {
  name: string;
  triggerEvent: string;
  active: boolean;
}

const EMPTY_FORM: WorkflowFormData = {
  name: '',
  triggerEvent: 'BOOKING_CREATED',
  active: true,
};

const TRIGGER_EVENTS = [
  'BOOKING_CREATED',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'BOOKING_COMPLETED',
  'PAYMENT_RECEIVED',
  'CLIENT_CREATED',
] as const;

// ---------- Helpers ----------

function formatTriggerEvent(event: string): string {
  return event.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------- Component ----------

export default function WorkflowsSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState<WorkflowFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirm dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingWorkflow, setDeletingWorkflow] = useState<Workflow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Actions dropdown
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Fetch workflows
  const fetchWorkflows = useCallback(async () => {
    if (!tenantId) return;

    try {
      const data = await apiClient.get<Workflow[]>(
        `/api/tenants/${tenantId}/workflows`,
      );
      setWorkflows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load workflows',
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
    void fetchWorkflows();
  }, [tenantId, fetchWorkflows]);

  // Open create dialog
  const openCreateDialog = () => {
    setEditingWorkflow(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name,
      triggerEvent: workflow.triggerEvent,
      active: workflow.active,
    });
    setFormError(null);
    setOpenActionId(null);
    setDialogOpen(true);
  };

  // Toggle active status
  const handleToggleActive = async (workflow: Workflow) => {
    if (!tenantId) return;

    try {
      await apiClient.patch(
        `/api/tenants/${tenantId}/workflows/${workflow.id}`,
        { active: !workflow.active },
      );
      await fetchWorkflows();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update workflow status',
      );
    }
  };

  // Submit form (create or update)
  const handleSubmitForm = async () => {
    if (!tenantId) return;
    setFormError(null);

    const name = formData.name.trim();
    if (!name) {
      setFormError('Workflow name is required');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        triggerEvent: formData.triggerEvent,
        active: formData.active,
      };

      if (editingWorkflow) {
        await apiClient.patch(
          `/api/tenants/${tenantId}/workflows/${editingWorkflow.id}`,
          payload,
        );
        setSuccess('Workflow updated successfully');
      } else {
        await apiClient.post(
          `/api/tenants/${tenantId}/workflows`,
          payload,
        );
        setSuccess('Workflow created successfully');
      }

      setDialogOpen(false);
      await fetchWorkflows();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to save workflow',
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete workflow
  const handleDelete = async () => {
    if (!tenantId || !deletingWorkflow) return;
    setDeleting(true);

    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/workflows/${deletingWorkflow.id}`,
      );
      setDeleteDialogOpen(false);
      setDeletingWorkflow(null);
      setSuccess('Workflow deleted successfully');
      await fetchWorkflows();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete workflow',
      );
    } finally {
      setDeleting(false);
    }
  };

  // Close actions dropdown when clicking outside
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
            <h2 className="text-lg font-semibold">Workflows</h2>
            <p className="text-sm text-muted-foreground">
              Automate actions based on booking events
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
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

      {/* Workflows Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Rules</CardTitle>
          <CardDescription>
            {workflows.length === 0
              ? 'No workflows created yet. Create one to automate your business processes.'
              : `${workflows.length} workflow${workflows.length !== 1 ? 's' : ''} total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No workflows yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create automated actions triggered by booking events
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Workflow
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger Event</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium">
                      {workflow.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTriggerEvent(workflow.triggerEvent)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {workflow.actions.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(workflow)}
                      >
                        {workflow.active ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(workflow.lastTriggeredAt)}
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionId(
                              openActionId === workflow.id
                                ? null
                                : workflow.id,
                            );
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>

                        {openActionId === workflow.id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border bg-background py-1 shadow-md">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                              onClick={() => openEditDialog(workflow)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                              onClick={() => {
                                setDeletingWorkflow(workflow);
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
              {editingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
            </DialogTitle>
            <DialogDescription>
              {editingWorkflow
                ? 'Update the workflow details below'
                : 'Set up a new automated workflow for your business'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="workflow-name">Name</Label>
              <Input
                id="workflow-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Send confirmation email"
              />
            </div>

            {/* Trigger Event */}
            <div className="space-y-2">
              <Label htmlFor="workflow-trigger">Trigger Event</Label>
              <Select
                value={formData.triggerEvent}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, triggerEvent: v }))
                }
              >
                <SelectTrigger id="workflow-trigger" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map((event) => (
                    <SelectItem key={event} value={event}>
                      {formatTriggerEvent(event)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="workflow-active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Enable or disable this workflow
                </p>
              </div>
              <Switch
                id="workflow-active"
                checked={formData.active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, active: checked }))
                }
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
                  {editingWorkflow ? 'Updating...' : 'Creating...'}
                </>
              ) : editingWorkflow ? (
                'Update Workflow'
              ) : (
                'Create Workflow'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the workflow{' '}
              <span className="font-semibold">
                {deletingWorkflow?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingWorkflow(null);
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
