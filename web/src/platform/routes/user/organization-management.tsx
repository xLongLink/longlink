import { api } from '@/lib/api';
import { ExternalLink, Plus } from 'lucide-react';
import { apiQueryOptions } from '@/lib/react-query';
import { Link } from '@/components/longlink/action/link';
import { useSelection } from '@/lib/hooks/use-selection';
import { Text } from '@/components/longlink/display/text';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Badge } from '@/components/longlink/display/badge';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Avatar } from '@/components/longlink/display/avatar';
import { Heading } from '@/components/longlink/display/heading';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useQueryClient, useSuspenseQueries } from '@tanstack/react-query';
import CreateOrganization from '@/platform/routes/user/dialogs/create-organization';
import { MembershipConfirmation } from '@/platform/components/membership-confirmation';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

const membershipsQuery = apiQueryOptions('/api/v1/me/organizations', schemas.zUserOrganizationMembership.array());

const invitationsQuery = apiQueryOptions('/api/v1/me/invitations', schemas.zUserOrganizationInvitation.array());

/** Owns membership loading, pending invitations, and organization creation for the overview and account settings. */
export default function OrganizationManagement({ presentation }: { presentation: 'overview' | 'settings' }) {
    const [selected, setSelected, closeSelected] = useSelection<
        { type: 'create' } | { type: 'accept' | 'decline'; id: string; name: string }
    >();

    const client = useQueryClient();

    // Start independent account reads together, retaining their separate cache entries.
    const [{ data: memberships }, { data: invitations }] = useSuspenseQueries({
        queries: [membershipsQuery, invitationsQuery]
    });

    const invalidateMemberships = () => client.invalidateQueries({ queryKey: membershipsQuery.queryKey, exact: true });

    const onboarding = presentation === 'overview' && memberships.length === 0 && invitations.length === 0;

    // List pending invitations above memberships in the same organization table.
    const rows = [
        ...invitations.map((invitation) => ({ ...invitation, kind: 'invitation' as const })),
        ...memberships.map((membership) => ({ ...membership, kind: 'membership' as const }))
    ];

    // Keep overview onboarding and settings presentation around the same membership workflow.
    return (
        <>
            <Stack
                gap={presentation === 'settings' ? 0 : 4}
                justify={onboarding ? 'center' : undefined}
                className={onboarding ? 'min-h-(--page-content-height)' : undefined}
            >
                {presentation === 'settings' ? (
                    <Stack gap={4}>
                        <Stack
                            gap={0}
                            direction="horizontal"
                            justify="between"
                            align="end"
                            wrap="wrap"
                            className="min-h-8"
                        >
                            <Heading level={2} trim>
                                Organizations
                            </Heading>
                            <Button size="sm" onClick={() => setSelected({ type: 'create' })}>
                                Create Organization
                            </Button>
                        </Stack>
                        <Separator />
                    </Stack>
                ) : !onboarding ? (
                    <Stack
                        gap={0}
                        direction="horizontal"
                        justify="between"
                        align="center"
                        wrap="wrap"
                        className="min-h-12"
                    >
                        <Heading level={1}>Organizations</Heading>
                        <Button onClick={() => setSelected({ type: 'create' })}>Create Organization</Button>
                    </Stack>
                ) : null}
                {onboarding ? (
                    <Empty
                        icon="building-2"
                        title={<h1>Your Organizations</h1>}
                        description="Create an organization or accept an invitation to join one."
                    >
                        <Link variant="outline" href="/docs/" target="_blank">
                            Read the docs
                            <ExternalLink className="size-4" aria-hidden="true" />
                        </Link>
                        <Button onClick={() => setSelected({ type: 'create' })}>
                            <Plus className="size-4" aria-hidden="true" />
                            Create organization
                        </Button>
                    </Empty>
                ) : (
                    <Table wrap>
                        {presentation === 'overview' && (
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    {invitations.length > 0 && <TableHead align="end"></TableHead>}
                                </TableRow>
                            </TableHeader>
                        )}
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.kind === 'invitation' ? row.id : row.organization.id}>
                                    <TableCell>
                                        <Stack direction="horizontal" gap={3} align="center">
                                            <Avatar shape="rounded" name={row.organization.name} />
                                            <Stack align="start" gap={0}>
                                                {row.kind === 'invitation' ? (
                                                    <Text>{row.organization.name}</Text>
                                                ) : presentation === 'settings' ? (
                                                    <Stack direction="horizontal" gap={1} align="center">
                                                        <Link href={`/orgs/${row.organization.id}`}>
                                                            {row.organization.name}
                                                        </Link>
                                                        <Badge variant="secondary">{row.role}</Badge>
                                                    </Stack>
                                                ) : (
                                                    <Link href={`/orgs/${row.organization.id}`}>
                                                        {row.organization.name}
                                                    </Link>
                                                )}
                                                <Text size="xs" tone="muted">
                                                    {row.kind === 'invitation'
                                                        ? `Invitation · ${row.role}`
                                                        : 'Organization'}
                                                </Text>
                                            </Stack>
                                        </Stack>
                                    </TableCell>
                                    {invitations.length > 0 && (
                                        <TableCell align="end">
                                            {row.kind === 'invitation' ? (
                                                <Stack direction="horizontal" gap={2} justify="end">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setSelected({
                                                                type: 'decline',
                                                                id: row.id,
                                                                name: row.organization.name
                                                            })
                                                        }
                                                    >
                                                        Decline
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="primary"
                                                        onClick={() =>
                                                            setSelected({
                                                                type: 'accept',
                                                                id: row.id,
                                                                name: row.organization.name
                                                            })
                                                        }
                                                    >
                                                        Accept
                                                    </Button>
                                                </Stack>
                                            ) : null}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={invitations.length > 0 ? 2 : 1} align="center">
                                        <Empty title="No data" />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
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
                <MembershipConfirmation
                    destructive={selected.type === 'decline'}
                    title={selected.type === 'accept' ? 'Accept invitation' : 'Decline invitation'}
                    description={
                        selected.type === 'accept'
                            ? `Accept the invitation to join ${selected.name}?`
                            : `Decline the invitation to ${selected.name}? You will need a new invitation to join.`
                    }
                    actionLabel={selected.type === 'accept' ? 'Accept' : 'Decline'}
                    onClose={closeSelected}
                    onConfirm={async () => {
                        // Apply only the confirmed invitation action.
                        try {
                            if (selected.type === 'accept') {
                                await api.post(`/api/v1/me/invitations/${selected.id}/accept`);
                            } else {
                                await api.delete(`/api/v1/me/invitations/${selected.id}`);
                            }
                        } finally {
                            // Refresh even when the invitation expired or was revoked before confirmation.
                            await Promise.all([
                                client.invalidateQueries({ queryKey: invitationsQuery.queryKey, exact: true }),
                                ...(selected.type === 'accept' ? [invalidateMemberships()] : [])
                            ]);
                            closeSelected();
                        }
                    }}
                />
            )}
        </>
    );
}
