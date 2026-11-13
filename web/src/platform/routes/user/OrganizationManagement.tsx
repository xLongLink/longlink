import { api } from '@/lib/api';
import { useState } from 'react';
import { useApiError } from '@/lib/errors';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Dialog } from '@/components/ui/Dialog';
import { Divider } from '@/components/ui/Divider';
import { ExternalLink, Plus } from 'lucide-react';
import { apiQueryOptions } from '@/lib/react-query';
import CreateOrganization from './CreateOrganization';
import { Illustration } from '@/components/Illustration';
import { NativeLink as Link } from '@/components/ui/NativeLink';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeButton as Button } from '@/components/ui/NativeButton';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';
import { useQueryClient, useSuspenseQueries } from '@tanstack/react-query';
import { NativeTable as Table, proportional } from '@/components/ui/NativeTable';

const membershipsQuery = apiQueryOptions('/api/v1/me/organizations', schemas.zUserOrganizationMembership.array());

const invitationsQuery = apiQueryOptions('/api/v1/me/invitations', schemas.zUserOrganizationInvitation.array());

/** Owns membership loading, pending invitations, and organization creation for the overview and account settings. */
export default function OrganizationManagement({ presentation }: { presentation: 'overview' | 'settings' }) {
    const [selected, setSelected] = useState<
        { type: 'create' } | { type: 'accept' | 'decline'; id: string; name: string } | null
    >(null);

    const reportError = useApiError();
    const client = useQueryClient();

    // Start independent account reads together, retaining their separate cache entries.
    const [{ data: memberships }, { data: invitations }] = useSuspenseQueries({
        queries: [membershipsQuery, invitationsQuery],
    });

    const invalidateMemberships = () => client.invalidateQueries({ queryKey: membershipsQuery.queryKey, exact: true });

    const onboarding = presentation === 'overview' && memberships.length === 0 && invitations.length === 0;

    // List pending invitations above memberships in the same organization table.
    const rows = [
        ...invitations.map((invitation) => ({ ...invitation, kind: 'invitation' as const })),
        ...memberships.map((membership) => ({ ...membership, kind: 'membership' as const })),
    ];

    /** Closes only this attempt, leaving any replacement dialog open. */
    function closeSelected() {
        // Each render captures the attempt that owns its callbacks.
        setSelected((current) => (current === selected ? null : current));
    }

    // Keep overview onboarding and settings presentation around the same membership workflow.
    return (
        <>
            <Stack
                gap={onboarding ? 8 : 4}
                justify={onboarding ? 'center' : undefined}
                minHeight={
                    onboarding
                        ? 'calc(100dvh - var(--_app-shell-header-height, 0px) - var(--platform-toolbar-height, 0px) - var(--spacing-2) * 4)'
                        : undefined
                }
            >
                {presentation === 'settings' ? (
                    <>
                        <Stack
                            direction="horizontal"
                            justify="between"
                            align="end"
                            wrap="wrap"
                            minHeight="var(--size-element-md)"
                        >
                            <Heading level={2} hasCapsize>
                                Organizations
                            </Heading>
                            <Button
                                label="Create Organization"
                                size="sm"
                                onClick={() => setSelected({ type: 'create' })}
                            />
                        </Stack>
                        <Divider />
                    </>
                ) : !onboarding ? (
                    <Stack direction="horizontal" justify="between" align="center" wrap="wrap" className="min-h-12">
                        <Heading level={1}>Organizations</Heading>
                        <Button label="Create Organization" onClick={() => setSelected({ type: 'create' })} />
                    </Stack>
                ) : null}
                {onboarding ? (
                    <Stack gap={6} align="center">
                        <Illustration
                            src="/images/organization.png"
                            alt=""
                            className="size-20 object-contain"
                            width={1254}
                            height={1254}
                            decoding="async"
                        />
                        <Stack gap={0}>
                            <Heading level={1} justify="center">
                                Your Organizations
                            </Heading>
                            <Text as="p" color="secondary" justify="center">
                                A place for your workflows and data
                            </Text>
                        </Stack>
                        <Stack direction="horizontal" gap={3} justify="center" wrap="wrap">
                            <Button
                                label="Read the docs"
                                variant="secondary"
                                href="/docs/"
                                target="_blank"
                                rel="noopener noreferrer"
                                endContent={<ExternalLink className="size-4" aria-hidden="true" />}
                            />
                            <Button
                                label="Create organization"
                                variant="primary"
                                icon={<Plus className="size-4" aria-hidden="true" />}
                                onClick={() => setSelected({ type: 'create' })}
                            />
                        </Stack>
                    </Stack>
                ) : (
                    <Table
                        data={rows}
                        idKey={(row) => (row.kind === 'invitation' ? row.id : row.organization.id)}
                        hasHover
                        density="compact"
                        columns={[
                            {
                                key: 'organization',
                                header: 'Name',
                                width: proportional(1),
                                renderCell: (row) => (
                                    <Stack direction="horizontal" gap={3} align="center">
                                        <Avatar kind="organization" name={row.organization.name} />
                                        <Stack align="start" gap={presentation === 'overview' ? 0 : undefined}>
                                            {row.kind === 'invitation' ? (
                                                <Text>{row.organization.name}</Text>
                                            ) : presentation === 'settings' ? (
                                                <Stack direction="horizontal" gap={1} align="center">
                                                    <Link href={`/orgs/${row.organization.id}`}>
                                                        {row.organization.name}
                                                    </Link>
                                                    <Badge label={row.role} />
                                                </Stack>
                                            ) : (
                                                <Link href={`/orgs/${row.organization.id}`}>
                                                    {row.organization.name}
                                                </Link>
                                            )}
                                            <Text type="supporting">
                                                {row.kind === 'invitation'
                                                    ? `Invitation · ${row.role}`
                                                    : 'Organization'}
                                            </Text>
                                        </Stack>
                                    </Stack>
                                ),
                            },
                            ...(invitations.length > 0
                                ? [
                                      {
                                          key: 'actions',
                                          header: '',
                                          align: 'end' as const,
                                          renderCell: (row: (typeof rows)[number]) =>
                                              row.kind === 'invitation' ? (
                                                  <Stack direction="horizontal" gap={2} justify="end">
                                                      <Button
                                                          label="Decline"
                                                          size="sm"
                                                          variant="secondary"
                                                          onClick={() =>
                                                              setSelected({
                                                                  type: 'decline',
                                                                  id: row.id,
                                                                  name: row.organization.name,
                                                              })
                                                          }
                                                      />
                                                      <Button
                                                          label="Accept"
                                                          size="sm"
                                                          variant="primary"
                                                          onClick={() =>
                                                              setSelected({
                                                                  type: 'accept',
                                                                  id: row.id,
                                                                  name: row.organization.name,
                                                              })
                                                          }
                                                      />
                                                  </Stack>
                                              ) : null,
                                      },
                                  ]
                                : []),
                        ]}
                    />
                )}
            </Stack>
            {selected?.type === 'create' && (
                <CreateOrganization
                    onClose={closeSelected}
                    onSuccess={async () => {
                        // Refresh memberships before closing only this creation attempt.
                        await invalidateMemberships();
                        closeSelected();
                    }}
                />
            )}
            {selected && selected.type !== 'create' && (
                <Dialog
                    isOpen
                    title={selected.type === 'accept' ? 'Accept invitation' : 'Decline invitation'}
                    onOpenChange={(open) => {
                        if (!open) closeSelected();
                    }}
                >
                    <Stack gap={3}>
                        <Text color="secondary">
                            {selected.type === 'accept'
                                ? `Accept the invitation to join ${selected.name}?`
                                : `Decline the invitation to ${selected.name}? You will need a new invitation to join.`}
                        </Text>
                        <Stack direction="horizontal" gap={2} justify="end">
                            <Button label="Cancel" variant="ghost" onClick={closeSelected} />
                            <Button
                                label={selected.type === 'accept' ? 'Accept' : 'Decline'}
                                variant={selected.type === 'accept' ? 'primary' : 'destructive'}
                                clickAction={async () => {
                                    // Apply only the confirmed invitation action and report server failures.
                                    try {
                                        if (selected.type === 'accept') {
                                            await api.post(`/api/v1/me/invitations/${selected.id}/accept`);
                                        } else {
                                            await api.delete(`/api/v1/me/invitations/${selected.id}`);
                                        }
                                    } catch (failure) {
                                        reportError(failure);
                                    } finally {
                                        // Refresh even when the invitation expired or was revoked before confirmation.
                                        await Promise.all([
                                            client.invalidateQueries({
                                                queryKey: invitationsQuery.queryKey,
                                                exact: true,
                                            }),
                                            ...(selected.type === 'accept' ? [invalidateMemberships()] : []),
                                        ]);
                                        closeSelected();
                                    }
                                }}
                            />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
        </>
    );
}
