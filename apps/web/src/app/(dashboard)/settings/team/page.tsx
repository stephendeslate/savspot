'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, UserPlus } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { InviteDialog } from '@/components/team/invite-dialog';
import {
  MemberList,
  type TeamMember,
  type PendingInvitation,
} from '@/components/team/member-list';

export default function TeamSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();
  const { user } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const fetchTeamData = useCallback(async () => {
    if (!tenantId) return;

    try {
      setError(null);
      const [membersData, invitationsData] = await Promise.all([
        apiClient.get<TeamMember[]>(`/api/tenants/${tenantId}/team`),
        apiClient.get<PendingInvitation[]>(
          `/api/tenants/${tenantId}/team/invitations`,
        ),
      ]);
      setMembers(Array.isArray(membersData) ? membersData : []);
      setInvitations(
        Array.isArray(invitationsData) ? invitationsData : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load team data',
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
    void fetchTeamData();
  }, [tenantId, fetchTeamData]);

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
            <h2 className="text-lg font-semibold">Team</h2>
            <p className="text-sm text-muted-foreground">
              Manage your team members and invitations
            </p>
          </div>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>
            {members.length === 0
              ? 'No team members yet. Invite someone to collaborate on your business.'
              : `${members.length} member${members.length !== 1 ? 's' : ''} on your team`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 && invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserPlus className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Your team is empty. Invite members to start collaborating.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setInviteDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </div>
          ) : (
            <MemberList
              tenantId={tenantId}
              members={members}
              invitations={invitations}
              currentUserId={user?.id ?? null}
              onMembersChanged={fetchTeamData}
            />
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <InviteDialog
        tenantId={tenantId}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={fetchTeamData}
      />
    </div>
  );
}
