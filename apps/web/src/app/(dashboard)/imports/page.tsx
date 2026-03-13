'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import {
  Upload,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Skeleton, Tabs, TabsList, TabsTrigger, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Progress, ScrollArea } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import { formatStatus } from '@/lib/format-utils';

// ---------- Types ----------

interface ImportJob {
  id: string;
  sourcePlatform: string;
  importType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileUrl: string | null;
  totalRecords: number;
  processedRecords: number;
  errorCount: number;
  errorLog: Record<string, unknown> | null;
  initiatedBy: string;
  createdAt: string;
  completedAt: string | null;
}

interface ImportsResponse {
  data: ImportJob[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ImportErrorReport {
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

// ---------- Constants ----------

const STATUS_TABS = ['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;

const PAGE_LIMIT = 20;

function getImportStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ---------- Component ----------

export default function ImportsPage() {
  const { tenantId } = useTenant();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(PAGE_LIMIT),
    };
    if (statusFilter !== 'ALL') params['status'] = statusFilter;
    return params;
  }, [page, statusFilter]);

  const { data: importsRes, isLoading, error: queryError } = useQuery({
    queryKey: ['imports', tenantId, queryParams],
    queryFn: () => {
      const searchParams = new URLSearchParams(queryParams).toString();
      return apiClient.getRaw<ImportsResponse>(
        `/api/tenants/${tenantId}/imports?${searchParams}`,
      );
    },
    enabled: !!tenantId,
  });

  const { data: errorReport } = useQuery({
    queryKey: ['import-errors', tenantId, selectedJob?.id],
    queryFn: () =>
      apiClient.get<ImportErrorReport>(
        `/api/tenants/${tenantId}/imports/${selectedJob!.id}/errors`,
      ),
    enabled: !!tenantId && !!selectedJob && errorDialogOpen,
  });

  const imports = importsRes?.data ?? [];
  const total = importsRes?.meta?.total ?? 0;
  const error = queryError
    ? (queryError instanceof Error ? queryError.message : 'Failed to load imports')
    : null;
  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const handlePreviousPage = () => {
    setPage((p) => p - 1);
  };

  const handleNextPage = () => {
    setPage((p) => p + 1);
  };

  const handleViewErrors = useCallback((job: ImportJob) => {
    setSelectedJob(job);
    setErrorDialogOpen(true);
  }, []);

  const handleRowClick = useCallback((job: ImportJob) => {
    setSelectedJob(job);
  }, []);

  // ---------- Loading ----------

  if (isLoading && imports.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
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
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Imports</h2>
        <p className="text-sm text-muted-foreground">
          View and track data import jobs
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab === 'ALL' ? 'All' : formatStatus(tab)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Import Jobs
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Upload className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No imports yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Import jobs will appear here when you import data from external
                platforms.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Import Type</TableHead>
                    <TableHead>Source Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Records</TableHead>
                    <TableHead className="hidden md:table-cell">Errors</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((job) => (
                    <TableRow
                      key={job.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(job)}
                    >
                      <TableCell>
                        <div className="font-medium">
                          {formatStatus(job.importType)}
                        </div>
                      </TableCell>
                      <TableCell>{job.sourcePlatform}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getImportStatusColor(job.status)}
                        >
                          {formatStatus(job.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {job.processedRecords} / {job.totalRecords}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {job.errorCount > 0 ? (
                          <span className="text-destructive">{job.errorCount}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap lg:table-cell">
                        {format(new Date(job.createdAt), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>
                        {job.errorCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewErrors(job);
                            }}
                          >
                            <AlertCircle className="h-4 w-4" />
                          </Button>
                        )}
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

      {/* Job Details Panel */}
      {selectedJob && !errorDialogOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Import Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{formatStatus(selectedJob.importType)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform</p>
                <p className="font-medium">{selectedJob.sourcePlatform}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={getImportStatusColor(selectedJob.status)}
                >
                  {formatStatus(selectedJob.status)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="font-medium">
                  {format(new Date(selectedJob.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>

            {selectedJob.totalRecords > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span>
                    {selectedJob.processedRecords} / {selectedJob.totalRecords} records
                  </span>
                </div>
                <Progress
                  value={
                    selectedJob.totalRecords > 0
                      ? (selectedJob.processedRecords / selectedJob.totalRecords) * 100
                      : 0
                  }
                />
              </div>
            )}

            {selectedJob.completedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-medium">
                  {format(new Date(selectedJob.completedAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            )}

            {selectedJob.errorCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewErrors(selectedJob)}
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                View {selectedJob.errorCount} Error{selectedJob.errorCount !== 1 ? 's' : ''}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Report Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Error Report</DialogTitle>
            <DialogDescription>
              {selectedJob
                ? `${selectedJob.errorCount} error${selectedJob.errorCount !== 1 ? 's' : ''} found during import`
                : 'Import errors'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {errorReport?.errors && errorReport.errors.length > 0 ? (
              <div className="space-y-2">
                {errorReport.errors.map((err, i) => (
                  <div
                    key={i}
                    className="rounded-md border p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Row {err.row}</span>
                      <Badge variant="outline" className="text-xs">
                        {err.field}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{err.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {errorReport ? 'No error details available' : 'Loading errors...'}
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
