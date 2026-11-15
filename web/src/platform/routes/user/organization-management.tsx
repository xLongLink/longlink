import { api } from '@/lib/api';
import { useState } from 'react';
import { useApiError } from '@/lib/errors';
import { Badge } from '@/components/reui/badge';
import { ExternalLink, Plus } from 'lucide-react';
import { apiQueryOptions } from '@/lib/react-query';
import { Separator } from '@/components/shadcn/separator';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Button, buttonVariants } from '@/components/shadcn/button';
import { NativeLink as Link } from '@/components/custom/native-link';
import { GeneratedAvatar } from '@/components/custom/generated-avatar';
import { NativeNavigationLink } from '@/components/custom/native-link';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import CreateOrganization from '@/components/dialogs/create-organization';
import { useQueryClient, useSuspenseQueries } from '@tanstack/react-query';
import { InvitationResponse } from '@/components/dialogs/invitation-response';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/shadcn/table';

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
        queries: [membershipsQuery, invitationsQuery]
    });

    const invalidateMemberships = () => client.invalidateQueries({ queryKey: membershipsQuery.queryKey, exact: true });

    const onboarding = presentation === 'overview' && memberships.length === 0 && invitations.length === 0;

    // List pending invitations above memberships in the same organization table.
    const rows = [
        ...invitations.map((invitation) => ({ ...invitation, kind: 'invitation' as const })),
        ...memberships.map((membership) => ({ ...membership, kind: 'membership' as const }))
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
                        ? 'calc(100dvh - var(--_app-shell-header-height, 0px) - var(--platform-toolbar-height, 0px) - var(--spacing) * 8)'
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
                            minHeight="calc(var(--spacing)*8)"
                        >
                            <h2 className="font-semibold tracking-tight text-3xl block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                                Organizations
                            </h2>
                            <Button size="sm" onClick={() => setSelected({ type: 'create' })}>
                                Create Organization
                            </Button>
                        </Stack>
                        <Separator />
                    </>
                ) : !onboarding ? (
                    <Stack direction="horizontal" justify="between" align="center" wrap="wrap" className="min-h-12">
                        <h1 className="font-semibold tracking-tight text-4xl">Organizations</h1>
                        <Button onClick={() => setSelected({ type: 'create' })}>Create Organization</Button>
                    </Stack>
                ) : null}
                {onboarding ? (
                    <Stack gap={6} align="center">
                        <img
                            src="/images/organization.png"
                            alt=""
                            className="size-20 object-contain invert dark:invert-0"
                            width={1254}
                            height={1254}
                            decoding="async"
                        />
                        <Stack gap={0}>
                            <h1 className="font-semibold tracking-tight text-4xl text-center">Your Organizations</h1>
                            <p className="text-muted-foreground text-center">A place for your workflows and data</p>
                        </Stack>
                        <Stack direction="horizontal" gap={3} justify="center" wrap="wrap">
                            <NativeNavigationLink
                                className={buttonVariants({ variant: 'outline' })}
                                href="/docs/"
                                target="_blank"
                            >
                                Read the docs
                                <ExternalLink className="size-4" aria-hidden="true" />
                            </NativeNavigationLink>
                            <Button onClick={() => setSelected({ type: 'create' })}>
                                <Plus className="size-4" aria-hidden="true" />
                                Create organization
                            </Button>
                        </Stack>
                    </Stack>
                ) : (
                    <Table className="[&_td]:whitespace-normal">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                {invitations.length > 0 && <TableHead className="text-end"></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.kind === 'invitation' ? row.id : row.organization.id}>
                                    <TableCell>
                                        <Stack direction="horizontal" gap={3} align="center">
                                            <GeneratedAvatar kind="organization" name={row.organization.name} />
                                            <Stack align="start" gap={presentation === 'overview' ? 0 : undefined}>
                                                {row.kind === 'invitation' ? (
                                                    <span>{row.organization.name}</span>
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
                                                <span className="text-xs text-muted-foreground">
                                                    {row.kind === 'invitation'
                                                        ? `Invitation · ${row.role}`
                                                        : 'Organization'}
                                                </span>
                                            </Stack>
                                        </Stack>
                                    </TableCell>
                                    {invitations.length > 0 && (
                                        <TableCell className="text-end">
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
                                                        variant="default"
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
                                    <TableCell colSpan={invitations.length > 0 ? 2 : 1} className="text-center">
                                        <span role="status">No data</span>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </Stack>
            {selected?.type === 'create' && (
                <CreateOrganization
                    open
                    onOpenChange={closeSelected}
                    onSuccess={async () => {
                        // Refresh memberships before closing only this creation attempt.
                        await invalidateMemberships();
                        closeSelected();
                    }}
                />
            )}
            {selected && selected.type !== 'create' && (
                <InvitationResponse
                    open
                    invitation={selected}
                    onOpenChange={closeSelected}
                    onConfirm={async () => {
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
