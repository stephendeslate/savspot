'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  FileCheck,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  XCircle,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Textarea } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import { formatStatus } from '@/lib/format-utils';

// ---------- Types ----------

interface Contract {
  id: string;
  name: string;
  clientName: string;
  clientEmail: string;
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'VOIDED';
  templateName: string | null;
  createdAt: string;
  signedAt: string | null;
}

interface ContractsResponse {
  data: Contract[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface ContractTemplate {
  id: string;
  name: string;
}

interface ContractFormData {
  name: string;
  clientEmail: string;
  templateId: string;
  content: string;
}

// ---------- Constants ----------

const PAGE_LIMIT = 20;

const EMPTY_FORM: ContractFormData = {
  name: '',
  clientEmail: '',
  templateId: '',
  content: '',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'SIGNED', label: 'Signed' },
  { value: 'VOIDED', label: 'Voided' },
];

// ---------- Helpers ----------

function getContractStatusColor(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800';
    case 'SENT':
      return 'bg-blue-100 text-blue-800';
    case 'SIGNED':
      return 'bg-green-100 text-green-800';
    case 'VOIDED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ---------- Component ----------

export default function ContractsPage() {
  const { tenantId } = useTenant();

  // List state
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState<ContractFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);

  // Actions dropdown
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Fetch contracts
  const fetchContracts = useCallback(async () => {
    if (!tenantId) return;

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      if (statusFilter) params.set('status', statusFilter);

      const res = await apiClient.getRaw<ContractsResponse>(
        `/api/tenants/${tenantId}/contracts?${params.toString()}`,
      );
      setContracts(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load contracts',
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, page, statusFilter]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!tenantId) return;

    try {
      const data = await apiClient.get<ContractTemplate[]>(
        `/api/tenants/${tenantId}/contract-templates`,
      );
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      // Templates are optional; silently ignore errors
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchContracts();
    void fetchTemplates();
  }, [tenantId, fetchContracts, fetchTemplates]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Open create dialog
  const openCreateDialog = () => {
    setEditingContract(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      name: contract.name,
      clientEmail: contract.clientEmail,
      templateId: '',
      content: '',
    });
    setFormError(null);
    setOpenActionId(null);
    setDialogOpen(true);
  };

  // Submit form
  const handleSubmitForm = async () => {
    if (!tenantId) return;
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Contract name is required');
      return;
    }

    if (!formData.clientEmail.trim()) {
      setFormError('Client email is required');
      return;
    }

    setSaving(true);

    const previous = contracts;
    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      clientEmail: formData.clientEmail.trim(),
    };
    if (formData.templateId) payload['templateId'] = formData.templateId;
    if (formData.content.trim()) payload['content'] = formData.content.trim();

    if (editingContract) {
      setContracts((prev) =>
        prev.map((c) =>
          c.id === editingContract.id
            ? { ...c, name: formData.name.trim(), clientEmail: formData.clientEmail.trim() }
            : c,
        ),
      );
    } else {
      const optimistic: Contract = {
        id: `optimistic-${Date.now()}`,
        name: formData.name.trim(),
        clientName: '',
        clientEmail: formData.clientEmail.trim(),
        status: 'DRAFT',
        templateName: null,
        createdAt: new Date().toISOString(),
        signedAt: null,
      };
      setContracts((prev) => [optimistic, ...prev]);
    }
    setDialogOpen(false);

    try {
      if (editingContract) {
        await apiClient.patch(
          `/api/tenants/${tenantId}/contracts/${editingContract.id}`,
          payload,
        );
        setSuccess('Contract updated successfully');
      } else {
        await apiClient.post(
          `/api/tenants/${tenantId}/contracts`,
          payload,
        );
        setSuccess('Contract created successfully');
      }

      await fetchContracts();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setContracts(previous);
      setDialogOpen(true);
      setFormError(
        err instanceof Error ? err.message : 'Failed to save contract',
      );
    } finally {
      setSaving(false);
    }
  };

  // Send contract
  const handleSendContract = async (contract: Contract) => {
    if (!tenantId) return;
    setOpenActionId(null);

    const previous = contracts;
    setContracts((prev) =>
      prev.map((c) => (c.id === contract.id ? { ...c, status: 'SENT' } : c)),
    );
    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/contracts/${contract.id}/send`,
      );
      setSuccess('Contract sent successfully');
      await fetchContracts();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setContracts(previous);
      setError(
        err instanceof Error ? err.message : 'Failed to send contract',
      );
    }
  };

  // Void contract
  const handleVoidContract = async (contract: Contract) => {
    if (!tenantId) return;
    setOpenActionId(null);

    const previous = contracts;
    setContracts((prev) =>
      prev.map((c) => (c.id === contract.id ? { ...c, status: 'VOIDED' } : c)),
    );
    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/contracts/${contract.id}/void`,
      );
      setSuccess('Contract voided successfully');
      await fetchContracts();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setContracts(previous);
      setError(
        err instanceof Error ? err.message : 'Failed to void contract',
      );
    }
  };

  const handlePreviousPage = () => {
    setPage((p) => p - 1);
  };

  const handleNextPage = () => {
    setPage((p) => p + 1);
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
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Contracts</h2>
          <p className="text-sm text-muted-foreground">
            Manage client contracts and agreements
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Contract
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

      {/* Filter */}
      <div className="flex items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="contract-status-filter" className="sr-only">
            Status Filter
          </Label>
          <Select
            value={statusFilter || 'all'}
            onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger id="contract-status-filter" className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value || 'all'} value={s.value || 'all'}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Contracts
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No contracts yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create your first contract to formalize agreements with clients.
              </p>
              <Button className="mt-4" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create Contract
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden md:table-cell">Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                    <TableHead className="hidden lg:table-cell">Signed Date</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">
                        {contract.name}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {contract.clientName}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {contract.clientEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-muted-foreground">
                          {contract.templateName ?? '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getContractStatusColor(contract.status)}
                        >
                          {formatStatus(contract.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap sm:table-cell">
                        {format(new Date(contract.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap lg:table-cell">
                        {contract.signedAt
                          ? format(new Date(contract.signedAt), 'MMM d, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionId(
                                openActionId === contract.id
                                  ? null
                                  : contract.id,
                              );
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>

                          {openActionId === contract.id && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border bg-background py-1 shadow-md">
                              {contract.status === 'DRAFT' && (
                                <>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                                    onClick={() => openEditDialog(contract)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                                    onClick={() =>
                                      void handleSendContract(contract)
                                    }
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    Send
                                  </button>
                                </>
                              )}
                              {(contract.status === 'SENT' ||
                                contract.status === 'SIGNED') && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                                  onClick={() =>
                                    void handleVoidContract(contract)
                                  }
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Void
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContract ? 'Edit Contract' : 'Create Contract'}
            </DialogTitle>
            <DialogDescription>
              {editingContract
                ? 'Update the contract details below'
                : 'Create a new contract for a client'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="contract-name">Name</Label>
              <Input
                id="contract-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Service Agreement"
              />
            </div>

            {/* Client Email */}
            <div className="space-y-2">
              <Label htmlFor="contract-client-email">Client Email</Label>
              <Input
                id="contract-client-email"
                type="email"
                value={formData.clientEmail}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    clientEmail: e.target.value,
                  }))
                }
                placeholder="client@example.com"
              />
            </div>

            {/* Template */}
            <div className="space-y-2">
              <Label htmlFor="contract-template">Template</Label>
              <Select
                value={formData.templateId || 'none'}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    templateId: v === 'none' ? '' : v,
                  }))
                }
              >
                <SelectTrigger id="contract-template" className="w-full">
                  <SelectValue placeholder="No template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="contract-content">Content</Label>
              <Textarea
                id="contract-content"
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                placeholder="Enter contract content..."
                rows={8}
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
                  {editingContract ? 'Updating...' : 'Creating...'}
                </>
              ) : editingContract ? (
                'Update Contract'
              ) : (
                'Create Contract'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
