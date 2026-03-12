'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Download,
  Shield,
  Trash2,
} from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Separator, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export default function PortalSettingsPage() {
  const { logout } = useAuth();

  // Export data state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Delete account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleExportData = async () => {
    setExportLoading(true);
    setExportSuccess(false);
    setExportError(null);

    try {
      await apiClient.post('/api/portal/data-export');
      setExportSuccess(true);
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : 'Failed to request data export. Please try again.',
      );
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await apiClient.post('/api/portal/account-deletion');
      setDeleteSuccess(true);
      setDeleteDialogOpen(false);
      // Log the user out after account deletion
      setTimeout(async () => {
        await logout();
      }, 2000);
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : 'Failed to delete account. Please try again.',
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account settings and privacy
        </p>
      </div>

      {/* Data & Privacy section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Data & Privacy</CardTitle>
              <CardDescription>
                Export your data or delete your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Data */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Export My Data</p>
              <p className="text-xs text-muted-foreground">
                Download a copy of all your personal data, including bookings,
                payments, and profile information.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={exportLoading}
              className="shrink-0"
            >
              <Download className="mr-2 h-4 w-4" />
              {exportLoading ? 'Requesting...' : 'Export My Data'}
            </Button>
          </div>

          {exportSuccess && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
              Data export requested successfully. You will receive an email with
              a download link once your data is ready.
            </div>
          )}

          {exportError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {exportError}
            </div>
          )}

          <Separator />

          {/* Delete Account */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                Delete My Account
              </p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteSuccess}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>

          {deleteSuccess && (
            <div className="rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-700">
              Your account has been scheduled for deletion. You will be logged
              out shortly.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Your Account
            </DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md bg-destructive/10 p-4 text-sm">
              <p className="font-medium text-destructive">Warning</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                <li>All your personal data will be permanently deleted</li>
                <li>Your booking history will be removed</li>
                <li>Your payment records will be anonymized</li>
                <li>You will not be able to recover your account</li>
              </ul>
            </div>

            {deleteError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {deleteError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteError(null);
              }}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading
                ? 'Deleting...'
                : 'Yes, Delete My Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
