import { api } from '@/lib/api';
import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApi } from '@/lib/hooks/use-api';
import { Button } from '@/components/shadcn/button';
import * as permissions from '@/platform/permissions';
import { useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Empty } from '@/components/longlink/display/empty';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { Avatar } from '@/components/longlink/display/avatar';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import type { OrganizationContext } from '@/platform/layouts/organization';
import { MembershipConfirmation } from '@/platform/components/membership-confirmation';
import { Table, TableBody, TableRow, TableCell } from '@/components/longlink/display/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/shadcn/dropdown-menu';

/** Owns role-change and seat-removal confirmations only while the members section is active. */
export default function MembersSection({ base, role }: { base: string; role: OrganizationContext['role'] }) {
    const user = useAuthenticatedUser();
    const client = useQueryClient();
    const navigate = useNavigate();
    const canAdminister = permissions.canAdminister(role);
    const canManageOwners = role === 'owner';

    const [member, setMember] = useState<{
        id: string;
        action: { kind: 'role'; role: permissions.AssignableRole } | { kind: 'remove' };
    } | null>(null);

    // Load and invalidate members independently of pending invitations.
    const [members, invalidateMembers] = useApi(`${base}/members`, schemas.zOrganizationMemberAccessResponse.array());

    // An open confirmation must respect refreshed caller and target roles as well as its original menu.
    const selectedMember = members.find((row) => row.user.id === member?.id);

    const canManageSelectedMember =
        canAdminister && selectedMember !== undefined && (canManageOwners || selectedMember.role !== 'owner');

    return (
        <>
            <Stack gap={0}>
                <Stack gap={4}>
                    <Stack gap={0} justify="end" className="min-h-8">
                        <h2 className="font-semibold tracking-tight text-3xl block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                            Members
                        </h2>
                    </Stack>
                    <Separator />
                </Stack>
                <Table wrap>
                    <TableBody>
                        {members.map((row) => (
                            <TableRow key={row.user.id}>
                                <TableCell>
                                    <Stack direction="horizontal" gap={3} align="center">
                                        <Avatar name={row.user.name} src={row.user.avatar} />
                                        <Stack gap={0} align="start">
                                            <Stack direction="horizontal" gap={1} align="center">
                                                <span>{row.user.name}</span>
                                                <span className="text-xs text-muted-foreground">{row.role}</span>
                                            </Stack>
                                            <span className="text-xs text-muted-foreground">{row.user.email}</span>
                                        </Stack>
                                    </Stack>
                                </TableCell>
                                {canAdminister && (
                                    <TableCell align="end">
                                        {row.role === 'owner' && !canManageOwners ? null : (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger
                                                    render={
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={`Actions for ${row.user.name}`}
                                                        >
                                                            <Ellipsis aria-hidden="true" />
                                                        </Button>
                                                    }
                                                />
                                                <DropdownMenuContent align="end">
                                                    {permissions.assignableRoleSchema.options.map((role) =>
                                                        role === row.role ? null : (
                                                            <DropdownMenuItem
                                                                key={role}
                                                                onClick={() =>
                                                                    setMember({
                                                                        id: row.user.id,
                                                                        action: { kind: 'role', role }
                                                                    })
                                                                }
                                                            >
                                                                {`Set as ${role[0].toUpperCase() + role.slice(1)}`}
                                                            </DropdownMenuItem>
                                                        )
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            setMember({ id: row.user.id, action: { kind: 'remove' } })
                                                        }
                                                    >
                                                        Remove member
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {members.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={canAdminister ? 2 : 1} align="center">
                                    <Empty role="status" title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Stack>
            {canManageSelectedMember && member && (
                <MembershipConfirmation
                    destructive={member.action.kind === 'remove'}
                    title={member.action.kind === 'remove' ? 'Remove member' : 'Change role'}
                    description={
                        member.action.kind === 'remove'
                            ? `Remove ${selectedMember.user.name} from this organization? Access is revoked immediately.`
                            : `Change ${selectedMember.user.name} to ${member.action.role}?`
                    }
                    actionLabel={member.action.kind === 'remove' ? 'Remove member' : 'Confirm'}
                    onOpenChange={() => setMember(null)}
                    onConfirm={async () => {
                        // Update access on the server before refreshing the member list.
                        if (member.action.kind === 'remove') {
                            await api.delete(`${base}/members/${member.id}`);

                            // Leave before clearing revoked access, without refetching an inaccessible member list.
                            if (member.id === user.id) {
                                await navigate('/user/organizations', { replace: true });
                                client.removeQueries({ queryKey: ['api', base], exact: true });
                                await client.invalidateQueries({
                                    queryKey: ['api', '/api/v1/me/organizations'],
                                    exact: true
                                });

                                return;
                            }
                        } else {
                            await api.patch(`${base}/members/${member.id}`, {
                                json: schemas.zOrganizationMemberUpdate.parse({ role: member.action.role })
                            });
                        }

                        // Refresh access-dependent controls after changing the current user's role.
                        const refreshes = [invalidateMembers()];

                        if (member.action.kind === 'role' && member.id === user.id) {
                            refreshes.push(
                                client.invalidateQueries({ queryKey: ['api', base], exact: true }),
                                client.invalidateQueries({ queryKey: ['api', '/api/v1/me/organizations'], exact: true })
                            );
                        }

                        await Promise.all(refreshes);
                        setMember((current) => (current === member ? null : current));
                    }}
                />
            )}
        </>
    );
}
