import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks/use-api';
import { useState, useTransition } from 'react';
import { useSubmit } from '@/lib/hooks/use-submit';
import { Button } from '@/components/shadcn/button';
import * as permissions from '@/platform/permissions';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Empty } from '@/components/longlink/display/empty';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import type { OrganizationContext } from '@/platform/layouts/organization';
import { InviteMember } from '@/platform/routes/orgs/dialogs/invite-member';
import { Table, TableBody, TableRow, TableCell } from '@/components/longlink/display/table';

/** Owns invitation drafts and actions only while their section is active. */
export default function InvitationsSection({ base, role }: { base: string; role: OrganizationContext['role'] }) {
    const [invitationAttempt, setInvitationAttempt] = useState<symbol | null>(null);
    const canMaintain = permissions.canMaintain(role);
    const canInviteAdmin = permissions.canAdminister(role);

    // Load and invalidate invitations independently of member access.
    const [invitations, invalidateInvitations] = useApi(
        `${base}/invitations`,
        schemas.zOrganizationInvitationResponse.array()
    );

    // Serialize revocation until the refreshed list is available.
    const [revoking, startTransition] = useTransition();
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
                                            onClick={() => {
                                                startTransition(async () => {
                                                    await revokeInvitation(row.id);
                                                });
                                            }}
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
                                    <Empty title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Stack>
            <span role="status" className="sr-only">
                {revoking ? 'Loading' : ''}
            </span>
            {invitationAttempt !== null && (
                <InviteMember
                    base={base}
                    canInviteAdmin={canInviteAdmin}
                    onSettled={invalidateInvitations}
                    onOpenChange={closeInvitation}
                />
            )}
        </>
    );
}
