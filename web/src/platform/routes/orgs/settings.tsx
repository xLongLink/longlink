import { z } from 'zod';
import Usage from './usage';
import { api } from '@/lib/api';
import TabsSection from './tags';
import Invoices from './invoices';
import Registries from './registries';
import { useApi } from '@/lib/hooks/use-api';
import PaymentMethods from './payment-methods';
import { ApiBoundary } from '@/components/api';
import { useState, useTransition } from 'react';
import { useSubmit } from '@/lib/hooks/use-submit';
import { Button } from '@/components/shadcn/button';
import * as permissions from '@/platform/permissions';
import SolutionManagement from './solution-management';
import { useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { Avatar } from '@/components/longlink/display/avatar';
import { DeletionDialog } from '@/components/dialogs/deletion';
import { InviteMember } from '@/components/dialogs/invite-member';
import { MemberAccess } from '@/components/dialogs/member-access';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import type { OrganizationContext } from '@/platform/layouts/organization';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router';
import { Boxes, Building2, ChevronDown, CreditCard, Ellipsis, Users } from 'lucide-react';
import { Table, TableBody, TableRow, TableCell } from '@/components/longlink/display/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/shadcn/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/shadcn/dropdown-menu';

const organizationSections = [
    { id: 'general', label: 'General' },
    { id: 'private-registries', label: 'Private registries' }
];

const billingSections = [
    { id: 'usage', label: 'Usage' },
    { id: 'payment-methods', label: 'Payment Methods' },
    { id: 'invoices', label: 'Invoices' }
];

const peopleSections = [
    { id: 'members', label: 'Members' },
    { id: 'invitations', label: 'Invitations' }
];

/** Shares organization identity and permissions while sections own resource lifetimes. */
export default function OrganizationSettings() {
    const membership = useOutletContext<OrganizationContext>();

    const base = `/api/v1/organizations/${membership.organization.id}`;
    const location = useLocation();

    // Unknown fragments select General; inactive sections never mount their queries or drafts.
    const section =
        [...organizationSections, ...billingSections, ...peopleSections, { id: 'solutions', label: 'Solutions' }].find(
            (item) => `#${item.id}` === location.hash
        )?.id ?? 'general';

    // Share the layout-resolved identity and permissions without loading inactive sections.
    const canMaintain = permissions.canMaintain(membership.role);

    return (
        <Stack gap={8}>
            <title>Organization Settings | LongLink</title>
            <Stack direction="horizontal" gap={3} align="center">
                <Avatar shape="rounded" name={membership.organization.name} />
                <Stack gap={0}>
                    <h4 className="font-semibold tracking-tight text-xl" aria-level={1}>
                        {membership.organization.name}
                    </h4>
                    <span className="text-xs text-muted-foreground">Organization</span>
                </Stack>
            </Stack>
            <div className="grid min-w-0 grid-cols-[260px_minmax(0,1fr)] items-start max-[47.999rem]:grid-cols-[minmax(0,1fr)] max-[47.999rem]:gap-6 [&>nav]:min-w-0">
                <nav aria-label="Settings sections" className="flex min-w-0 flex-col gap-0.5 pe-4">
                    {[
                        { label: 'Organization', icon: Building2, sections: organizationSections },
                        { label: 'Billing', icon: CreditCard, sections: billingSections },
                        { label: 'People', icon: Users, sections: peopleSections }
                    ].map((group) => (
                        <Collapsible key={group.label} defaultOpen>
                            <CollapsibleTrigger
                                render={<Button variant="ghost" size="sm" className="w-full justify-start" />}
                            >
                                <group.icon aria-hidden="true" />
                                {group.label}
                                <ChevronDown className="ms-auto in-data-open:rotate-180" aria-hidden="true" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="flex flex-col gap-0.5 ps-6">
                                    {group.sections.map((item) => (
                                        <Button
                                            nativeButton={false}
                                            render={<Link to={`${location.pathname}${location.search}#${item.id}`} />}
                                            variant={section === item.id ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="w-full justify-start"
                                            aria-current={section === item.id ? 'location' : undefined}
                                            key={item.id}
                                        >
                                            {item.label}
                                        </Button>
                                    ))}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    ))}
                    <Button
                        nativeButton={false}
                        render={<Link to={`${location.pathname}${location.search}#solutions`} />}
                        variant={section === 'solutions' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="w-full justify-start"
                        aria-current={section === 'solutions' ? 'location' : undefined}
                    >
                        <Boxes className="size-4" aria-hidden="true" />
                        Solutions
                    </Button>
                </nav>
                <Stack gap={3} className="min-w-0">
                    <ApiBoundary key={section}>
                        {section === 'usage' ? (
                            <Usage base={base} />
                        ) : section === 'payment-methods' ? (
                            <PaymentMethods base={base} canManage={membership.role === 'owner'} />
                        ) : section === 'invoices' ? (
                            <Invoices base={base} canManage={membership.role === 'owner'} />
                        ) : section === 'private-registries' ? (
                            <Registries base={base} canMaintain={canMaintain} />
                        ) : section === 'members' ? (
                            <MembersSection base={base} role={membership.role} />
                        ) : section === 'invitations' ? (
                            <InvitationsSection base={base} role={membership.role} />
                        ) : section === 'solutions' ? (
                            <SolutionManagement membership={membership} presentation="settings" />
                        ) : (
                            <GeneralSection
                                base={base}
                                tags={membership.tags}
                                name={membership.organization.name}
                                canMaintain={canMaintain}
                                canDelete={membership.role === 'owner'}
                            />
                        )}
                    </ApiBoundary>
                </Stack>
            </div>
        </Stack>
    );
}

/** Shows shared navigation categories and owner-only organization deletion. */
function GeneralSection({
    base,
    tags,
    name,
    canMaintain,
    canDelete
}: {
    base: string;
    tags: OrganizationContext['tags'];
    name: string;
    canMaintain: boolean;
    canDelete: boolean;
}) {
    const [isConfirming, setIsConfirming] = useState(false);

    return (
        <Stack gap={4}>
            <Stack gap={0} justify="end" className="min-h-8">
                <h2 className="font-semibold tracking-tight text-3xl block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                    General
                </h2>
            </Stack>
            <Separator />
            <TabsSection base={base} tags={tags} canMaintain={canMaintain} />
            {canDelete && (
                <Stack gap={3}>
                    <Stack gap={0} className="text-red-600 dark:text-red-400">
                        <h4 aria-level={3} className="font-semibold tracking-tight text-xl text-inherit">
                            Danger zone
                        </h4>
                    </Stack>
                    <Stack
                        direction="horizontal"
                        justify="between"
                        align="center"
                        wrap="wrap"
                        gap={4}
                        padding={4}
                        className="rounded-lg border border-red-600 dark:border-red-400"
                    >
                        <Stack gap={0}>
                            <span className="font-bold">Delete this organization</span>
                            <span className="text-muted-foreground">
                                Once deleted, it will be gone forever. Please be certain.
                            </span>
                        </Stack>
                        <Button variant="destructive" onClick={() => setIsConfirming(true)}>
                            Delete
                        </Button>
                    </Stack>
                </Stack>
            )}
            <DeletionDialog
                confirmation={
                    isConfirming
                        ? {
                              title: 'Delete organization',
                              description: `Delete ${name}? Once deleted, it will be gone forever. Please be certain.`,
                              onDelete: async () => {
                                  // Leave the deleted organization only after the server accepts deletion.
                                  await api.delete(base);
                                  window.location.assign('/user/organizations');
                              }
                          }
                        : null
                }
                onClose={() => setIsConfirming(false)}
            />
        </Stack>
    );
}

/** Owns role-change and seat-removal confirmations only while the members section is active. */
function MembersSection({ base, role }: { base: string; role: OrganizationContext['role'] }) {
    const user = useAuthenticatedUser();
    const client = useQueryClient();
    const navigate = useNavigate();
    const canAdminister = permissions.canAdminister(role);
    const canManageOwners = role === 'owner';

    const [member, setMember] = useState<{
        id: string;
        action: { kind: 'role'; role: string } | { kind: 'remove' };
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
                                                    {['read', 'write', 'maintain', 'admin'].map((role) =>
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
                <MemberAccess
                    name={selectedMember.user.name}
                    action={member.action}
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

/** Owns invitation drafts and actions only while their section is active. */
function InvitationsSection({ base, role }: { base: string; role: OrganizationContext['role'] }) {
    const [invitationAttempt, setInvitationAttempt] = useState<symbol | null>(null);
    const [revoking, startRevocation] = useTransition();
    const canMaintain = permissions.canMaintain(role);
    const canInviteAdmin = permissions.canAdminister(role);

    // Load and invalidate invitations independently of member access.
    const [invitations, invalidateInvitations] = useApi(
        `${base}/invitations`,
        schemas.zOrganizationInvitationResponse.array()
    );

    // Serialize revocation until the refreshed list is available.
    const revokeInvitation = useSubmit(
        async (id: string) => {
            await api.delete(`${base}/invitations/${id}`);
            await invalidateInvitations();
        },
        { onError: () => {} }
    );

    /** Closes only the invitation attempt that owns this callback. */
    function closeInvitation() {
        setInvitationAttempt((current) => (current === invitationAttempt ? null : current));
    }

    /** Sends the validated invitation and refreshes organization access. */
    async function inviteMember(data: z.output<typeof schemas.zOrganizationInvitationCreate>) {
        // Keep the dialog open on failure, but refresh either way because a failed email still saves the invitation.
        try {
            await api.post(`${base}/invitations`, {
                json: schemas.zOrganizationInvitationCreate.parse({ role: data.role, email: data.email.trim() })
            });
            closeInvitation();
        } finally {
            await invalidateInvitations();
        }
    }

    return (
        <>
            <Stack gap={0}>
                <Stack gap={4}>
                    <Stack gap={0} direction="horizontal" justify="between" align="end" wrap="wrap" className="min-h-8">
                        <h2 className="font-semibold tracking-tight text-3xl block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                            Invitations
                        </h2>
                        {canMaintain && (
                            <Button size="sm" onClick={() => setInvitationAttempt(Symbol())}>
                                Invite
                            </Button>
                        )}
                    </Stack>
                    <Separator />
                </Stack>
                <Table wrap>
                    <TableBody>
                        {invitations.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.email}</TableCell>
                                <TableCell>
                                    <span className="text-xs text-muted-foreground">{row.role}</span>
                                </TableCell>
                                {canMaintain && (
                                    <TableCell align="end">
                                        <Button
                                            variant="destructive"
                                            disabled={revoking}
                                            aria-busy={revoking || undefined}
                                            onClick={() => startRevocation(() => revokeInvitation(row.id))}
                                        >
                                            Revoke
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {invitations.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={canMaintain ? 3 : 2} align="center">
                                    <Empty role="status" title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Stack>
            <span role="status" className="sr-only">
                {revoking ? 'Loading' : ''}
            </span>
            <InviteMember
                open={invitationAttempt !== null}
                canInviteAdmin={canInviteAdmin}
                onOpenChange={closeInvitation}
                onSubmit={inviteMember}
            />
        </>
    );
}
import { Empty } from '@/components/longlink/display/empty';
