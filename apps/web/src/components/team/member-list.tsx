'use client';

import { useState, useCallback } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';

// ---------- Types ----------

type TeamRole = 'OWNER' | 'ADMIN' | 'STAFF';

export interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: TeamRole;
  createdAt: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: TeamRole;
  expiresAt: string;
  createdAt: string;
}

interface MemberListProps {
  tenantId: string;
  members: TeamMember[];
  invitations: PendingInvitation[];
  currentUserId: string | null;
  onMembersChanged: () => void;
}

// ---------- Helpers ----------

function getMemberName(member: TeamMember): string {
  if (member.firstName || member.lastName) {
    return [member.firstName, member.lastName].filter(Boolean).join(' ');
  }
  return member.email;
}

function getRoleBadge(role: TeamRole) {
  switch (role) {
    case 'OWNER':
      return <Badge className="bg-purple-100 text-purple-800">Owner</Badge>;
    case 'ADMIN':
      return <Badge className="bg-blue-100 text-blue-800">Admin</Badge>;
    case 'STAFF':
      return <Badge className="bg-gray-100 text-gray-800">Staff</Badge>;
    default:
      return <Badge>{role}</Badge>;
  }
}

function isExpired(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

// ---------- Component ----------

export function MemberList({
  tenantId,
  members,
  invitations,
  currentUserId,
  onMembersChanged,
}: MemberListProps) {
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Change member role
  const handleRoleChange = useCallback(
    async (userId: string, newRole: TeamRole) => {
      setError(null);
      setUpdatingRoleId(userId);

      try {
        await apiClient.patch(
          `/api/tenants/${tenantId}/team/${userId}/role`,
          { role: newRole },
        );
        onMembersChanged();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to update role',
        );
      } finally {
        setUpdatingRoleId(null);
      }
    },
    [tenantId, onMembersChanged],
  );

  // Remove member
  const handleRemoveMember = useCallback(async () => {
    if (!removingMember) return;
    setError(null);
    setRemovingMemberId(removingMember.id);

    try {
      await apiClient.del(
        `/api/tenants/${tenantId}/team/${removingMember.id}`,
      );
      setRemoveDialogOpen(false);
      setRemovingMember(null);
      onMembersChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to remove member',
      );
    } finally {
      setRemovingMemberId(null);
    }
  }, [tenantId, removingMember, onMembersChanged]);

  // Revoke invitation
  const handleRevokeInvitation = useCallback(
    async (invitationId: string) => {
      setError(null);
      setRevokingId(invitationId);

      try {
        await apiClient.del(
          `/api/tenants/${tenantId}/team/invitations/${invitationId}`,
        );
        onMembersChanged();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to revoke invitation',
        );
      } finally {
        setRevokingId(null);
      }
    },
    [tenantId, onMembersChanged],
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Team Members Table */}
      <div>
        <h3 className="mb-3 text-sm font-medium">
          Team Members ({members.length})
        </h3>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No team members yet. Invite someone to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isCurrentUser = member.id === currentUserId;
                const isOwner = member.role === 'OWNER';

                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {getMemberName(member)}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      {isOwner ? (
                        getRoleBadge(member.role)
                      ) : (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onChange={(e) =>
                              handleRoleChange(
                                member.id,
                                e.target.value as TeamRole,
                              )
                            }
                            disabled={
                              isCurrentUser ||
                              updatingRoleId === member.id
                            }
                            className="w-[120px]"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="STAFF">Staff</option>
                          </Select>
                          {updatingRoleId === member.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {!isOwner && !isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRemovingMember(member);
                            setRemoveDialogOpen(true);
                          }}
                          disabled={removingMemberId === member.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {removingMemberId === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium">
            Pending Invitations ({invitations.length})
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => {
                const expired = isExpired(invitation.expiresAt);

                return (
                  <TableRow key={invitation.id}>
                    <TableCell className="text-muted-foreground">
                      {invitation.email}
                    </TableCell>
                    <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                    <TableCell>
                      {expired ? (
                        <Badge className="bg-red-100 text-red-800">
                          Expired
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRevokeInvitation(invitation.id)
                        }
                        disabled={revokingId === invitation.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {revokingId === invitation.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-semibold">
                {removingMember ? getMemberName(removingMember) : ''}
              </span>{' '}
              from your team? They will lose access to your business
              immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemoveDialogOpen(false);
                setRemovingMember(null);
              }}
              disabled={removingMemberId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveMember}
              disabled={removingMemberId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingMemberId !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
