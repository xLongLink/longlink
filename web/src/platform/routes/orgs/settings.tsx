import { z } from 'zod';
import Usage from './usage';
import { api } from '@/lib/api';
import TabsSection from './tags';
import { useState } from 'react';
import Invoices from './invoices';
import Registries from './registries';
import { useApiError } from '@/lib/errors';
import { useApi } from '@/lib/hooks/use-api';
import PaymentMethods from './payment-methods';
import { ApiBoundary } from '@/components/api';
import { Form } from '@/components/custom/form';
import * as permissions from '@/platform/permissions';
import SolutionManagement from './solution-management';
import { DeletionDialog } from '@/components/deletion';
import { useQueryClient } from '@tanstack/react-query';
import { Selector } from '@/components/custom/selector';
import { Illustration } from '@/components/illustration';
import { Separator } from '@/components/shadcn/separator';
import { TextInput } from '@/components/custom/text-input';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { ActionMenu } from '@/components/custom/action-menu';
import { ViewDialog } from '@/components/custom/view-dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeText as Text } from '@/components/custom/native-text';
import { GeneratedAvatar } from '@/components/custom/generated-avatar';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DataTable, proportional } from '@/components/custom/data-table';
import { Button as MenuTriggerButton } from '@/components/shadcn/button';
import { NativeButton as Button } from '@/components/custom/native-button';
import type { OrganizationContext } from '@/platform/layouts/organization';
import { Boxes, Building2, CreditCard, Ellipsis, Users } from 'lucide-react';
import { NativeHeading as Heading } from '@/components/custom/native-heading';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router';
import '@/platform/components/settings-navigation.css';
import { IllustratedDialogContent } from '@/platform/components/illustrated-dialog-content';

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
                <GeneratedAvatar kind="organization" name={membership.organization.name} />
                <Stack gap={0}>
                    <Heading level={4} accessibilityLevel={1}>
                        {membership.organization.name}
                    </Heading>
                    <Text type="supporting">Organization</Text>
                </Stack>
            </Stack>
            <div className="grid min-w-0 grid-cols-[260px_minmax(0,1fr)] items-start max-[47.999rem]:grid-cols-[minmax(0,1fr)] max-[47.999rem]:gap-6 [&>nav]:min-w-0">
                <nav aria-label="Settings sections" className="settings-navigation">
                    <details open>
                        <summary>
                            <Building2 className="size-4" aria-hidden="true" />
                            Organization
                        </summary>
                        {organizationSections.map((item) => (
                            <Link
                                to={`${location.pathname}${location.search}#${item.id}`}
                                aria-current={section === item.id ? 'location' : undefined}
                                key={item.id}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </details>
                    <details open>
                        <summary>
                            <CreditCard className="size-4" aria-hidden="true" />
                            Billing
                        </summary>
                        {billingSections.map((item) => (
                            <Link
                                to={`${location.pathname}${location.search}#${item.id}`}
                                aria-current={section === item.id ? 'location' : undefined}
                                key={item.id}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </details>
                    <details open>
                        <summary>
                            <Users className="size-4" aria-hidden="true" />
                            People
                        </summary>
                        {peopleSections.map((item) => (
                            <Link
                                to={`${location.pathname}${location.search}#${item.id}`}
                                aria-current={section === item.id ? 'location' : undefined}
                                key={item.id}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </details>
                    <Link
                        to={`${location.pathname}${location.search}#solutions`}
                        aria-current={section === 'solutions' ? 'location' : undefined}
                    >
                        <Boxes className="size-4" aria-hidden="true" />
                        Solutions
                    </Link>
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
            <Stack justify="end" minHeight="var(--size-element-md)">
                <Heading level={2} hasCapsize>
                    General
                </Heading>
            </Stack>
            <Separator />
            <TabsSection base={base} tags={tags} canMaintain={canMaintain} />
            {canDelete && (
                <Stack gap={3}>
                    <Stack className="text-red-600 dark:text-red-400">
                        <Heading level={4} accessibilityLevel={3} color="inherit">
                            Danger zone
                        </Heading>
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
                            <Text weight="bold">Delete this organization</Text>
                            <Text color="secondary">Once deleted, it will be gone forever. Please be certain.</Text>
                        </Stack>
                        <Button label="Delete" variant="destructive" onClick={() => setIsConfirming(true)} />
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
            <Stack gap={4}>
                <Stack justify="end" minHeight="var(--size-element-md)">
                    <Heading level={2} hasCapsize>
                        Members
                    </Heading>
                </Stack>
                <Separator />
                <DataTable
                    data={members}
                    idKey={(row) => row.user.id}
                    hasHover
                    density="compact"
                    columns={[
                        {
                            key: 'user',
                            header: 'User',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack direction="horizontal" gap={3} align="center">
                                    <GeneratedAvatar name={row.user.name} src={row.user.avatar} seed={row.user.id} />
                                    <Stack align="start">
                                        <Stack direction="horizontal" gap={1} align="center">
                                            <Text>{row.user.name}</Text>
                                            <Text type="supporting">{row.role}</Text>
                                        </Stack>
                                        <Text type="supporting">{row.user.email}</Text>
                                    </Stack>
                                </Stack>
                            )
                        },
                        ...(canAdminister
                            ? [
                                  {
                                      key: 'role',
                                      header: 'Actions',
                                      align: 'end' as const,
                                      width: proportional(0.5),
                                      renderCell: (row: z.output<typeof schemas.zOrganizationMemberAccessResponse>) =>
                                          row.role === 'owner' && !canManageOwners ? null : (
                                              <ActionMenu
                                                  trigger={
                                                      <MenuTriggerButton
                                                          type="button"
                                                          variant="ghost"
                                                          size="icon"
                                                          aria-label={`Actions for ${row.user.name}`}
                                                      >
                                                          <Ellipsis aria-hidden="true" />
                                                      </MenuTriggerButton>
                                                  }
                                                  align="end"
                                                  items={[
                                                      ...['read', 'write', 'maintain', 'admin'].flatMap((role) =>
                                                          role === row.role
                                                              ? []
                                                              : [
                                                                    {
                                                                        id: role,
                                                                        label: `Set as ${role[0].toUpperCase() + role.slice(1)}`,
                                                                        onClick: () =>
                                                                            setMember({
                                                                                id: row.user.id,
                                                                                action: { kind: 'role', role }
                                                                            })
                                                                    }
                                                                ]
                                                      ),
                                                      {
                                                          id: 'remove',
                                                          label: 'Remove member',
                                                          onClick: () =>
                                                              setMember({ id: row.user.id, action: { kind: 'remove' } })
                                                      }
                                                  ]}
                                              />
                                          )
                                  }
                              ]
                            : [])
                    ]}
                />
            </Stack>
            {canManageSelectedMember && member && (
                <ViewDialog
                    isOpen
                    title={member.action.kind === 'remove' ? 'Remove member' : 'Change role'}
                    onOpenChange={(open) => {
                        if (!open) setMember(null);
                    }}
                >
                    <Stack gap={3}>
                        <Text color="secondary">
                            {member.action.kind === 'remove'
                                ? `Remove ${selectedMember.user.name} from this organization? Access is revoked immediately.`
                                : `Change ${selectedMember.user.name} to ${member.action.role}?`}
                        </Text>
                        <Stack direction="horizontal" gap={2} justify="end">
                            <Button label="Cancel" variant="ghost" onClick={() => setMember(null)} />
                            <Button
                                label={member.action.kind === 'remove' ? 'Remove member' : 'Confirm'}
                                variant={member.action.kind === 'remove' ? 'destructive' : 'default'}
                                clickAction={async () => {
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
                                            client.invalidateQueries({
                                                queryKey: ['api', '/api/v1/me/organizations'],
                                                exact: true
                                            })
                                        );
                                    }

                                    await Promise.all(refreshes);
                                    setMember((current) => (current === member ? null : current));
                                }}
                            />
                        </Stack>
                    </Stack>
                </ViewDialog>
            )}
        </>
    );
}

/** Owns invitation drafts and actions only while their section is active. */
function InvitationsSection({ base, role }: { base: string; role: OrganizationContext['role'] }) {
    const [invitationAttempt, setInvitationAttempt] = useState<symbol | null>(null);
    const reportError = useApiError();
    const canMaintain = permissions.canMaintain(role);
    const canInviteAdmin = permissions.canAdminister(role);

    // Load and invalidate invitations independently of member access.
    const [invitations, invalidateInvitations] = useApi(
        `${base}/invitations`,
        schemas.zOrganizationInvitationResponse.array()
    );

    /** Closes only the invitation attempt that owns this callback. */
    function closeInvitation() {
        setInvitationAttempt((current) => (current === invitationAttempt ? null : current));
    }

    /** Sends the validated invitation and refreshes organization access. */
    async function inviteMember(data: FormData) {
        // Keep the dialog open on failure, but refresh either way because a failed email still saves the invitation.
        try {
            await api.post(`${base}/invitations`, {
                json: schemas.zOrganizationInvitationCreate.parse({
                    role: data.get('role'),
                    email: z.string().trim().parse(data.get('email'))
                })
            });
            closeInvitation();
        } catch (failure) {
            reportError(failure);
        } finally {
            await invalidateInvitations();
        }
    }

    return (
        <>
            <Stack gap={4}>
                <Stack
                    direction="horizontal"
                    justify="between"
                    align="end"
                    wrap="wrap"
                    minHeight="var(--size-element-md)"
                >
                    <Heading level={2} hasCapsize>
                        Invitations
                    </Heading>
                    {canMaintain && <Button label="Invite" size="sm" onClick={() => setInvitationAttempt(Symbol())} />}
                </Stack>
                <Separator />
                <DataTable
                    data={invitations}
                    idKey="id"
                    hasHover
                    density="compact"
                    columns={[
                        { key: 'email', header: 'Email', width: proportional(1) },
                        {
                            key: 'role',
                            header: 'Role',
                            width: proportional(1),
                            renderCell: (row) => <Text type="supporting">{row.role}</Text>
                        },
                        ...(canMaintain
                            ? [
                                  {
                                      key: 'id',
                                      header: 'Actions',
                                      align: 'end' as const,
                                      width: proportional(0.5),
                                      renderCell: (row: z.output<typeof schemas.zOrganizationInvitationResponse>) => (
                                          <Button
                                              label="Revoke"
                                              variant="destructive"
                                              clickAction={async () => {
                                                  // Refresh organization access only after revocation succeeds.
                                                  await api.delete(`${base}/invitations/${row.id}`);
                                                  await invalidateInvitations();
                                              }}
                                          />
                                      )
                                  }
                              ]
                            : [])
                    ]}
                />
            </Stack>
            {/* Match organization creation with a centered form and a desktop-only illustration. */}
            <ViewDialog
                isOpen={invitationAttempt !== null}
                paddingInline={0}
                onOpenChange={(open) => {
                    if (!open) closeInvitation();
                }}
            >
                <IllustratedDialogContent
                    illustration={
                        <Illustration
                            src="/images/invitation.png"
                            alt="Hand-drawn envelopes."
                            className="h-full w-full object-contain"
                            width={1223}
                            height={1286}
                            decoding="async"
                        />
                    }
                >
                    <Stack height="100%" justify="center" width="max-content" maxWidth="100%" className="mx-auto">
                        <Form action={inviteMember}>
                            <Stack gap={10}>
                                <Stack gap={2} align="center">
                                    <Illustration
                                        src="/images/organization.png"
                                        alt=""
                                        className="size-20 object-contain"
                                        width={1254}
                                        height={1254}
                                        decoding="async"
                                    />
                                    <Stack gap={0}>
                                        <Heading level={2} justify="center">
                                            Invite user
                                        </Heading>
                                        <Text as="p" color="secondary" justify="center">
                                            Send an invitation to join this organization.
                                        </Text>
                                    </Stack>
                                </Stack>
                                {/* Let the subtitle size the column, then stretch the controls to match. */}
                                <Stack gap={4} width={0} className="min-w-full">
                                    <TextInput
                                        label="Email"
                                        type="email"
                                        name="email"
                                        placeholder="user@example.com"
                                        required
                                    />
                                    <Selector
                                        label="Role"
                                        name="role"
                                        defaultValue="write"
                                        hasClear={false}
                                        options={[
                                            { value: 'read', label: 'read', icon: 'lucide:eye-off' },
                                            { value: 'write', label: 'write', icon: 'lucide:arrow-up' },
                                            { value: 'maintain', label: 'maintain', icon: 'lucide:wrench' },
                                            ...(canInviteAdmin
                                                ? [
                                                      {
                                                          value: 'admin',
                                                          label: 'admin',
                                                          icon: 'lucide:check-check' as const
                                                      }
                                                  ]
                                                : [])
                                        ]}
                                    />
                                    <Button label="Invite" variant="default" type="submit" style={{ width: '100%' }} />
                                </Stack>
                            </Stack>
                        </Form>
                    </Stack>
                </IllustratedDialogContent>
            </ViewDialog>
        </>
    );
}
