import { api } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { useApi } from '@/lib/hooks/use-api';
import { Button } from '@/components/shadcn/button';
import * as permissions from '@/platform/permissions';
import { useSelection } from '@/lib/hooks/use-selection';
import { Text } from '@/components/longlink/display/text';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Empty } from '@/components/longlink/display/empty';
import { Heading } from '@/components/longlink/display/heading';
import { useConfirmAction } from '@/lib/hooks/use-confirm-action';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import type { OrganizationContext } from '@/platform/layouts/organization';
import { InviteMember } from '@/platform/routes/orgs/dialogs/invite-member';
import { Table, TableBody, TableRow, TableCell } from '@/components/longlink/display/table';

/** Owns invitation drafts and actions only while their section is active. */
export default function InvitationsSection({ base, role }: { base: string; role: OrganizationContext['role'] }) {
    const [invitationAttempt, setInvitationAttempt, closeInvitation] = useSelection<symbol>();
    const canMaintain = permissions.canMaintain(role);
    const canInviteAdmin = permissions.canAdminister(role);

    // Load and invalidate invitations independently of member access.
    const [invitations, invalidateInvitations] = useApi(
        `${base}/invitations`,
        schemas.zOrganizationInvitationResponse.array()
    );

    // Serialize revocation until the refreshed list is available.
    const reportError = useApiError();
    const { isPending: revoking, run } = useConfirmAction();

    function revokeInvitation(id: string) {
        run(async () => {
            try {
                await api.delete(`${base}/invitations/${id}`);
                await invalidateInvitations();
            } catch (cause) {
                reportError(cause);
            }
        });
    }

    return (
        <>
            <Stack gap={0}>
                <Stack gap={4}>
                    <Stack gap={0} direction="horizontal" justify="between" align="end" wrap="wrap" className="min-h-8">
                        <Heading level={2} trim>
                            Invitations
                        </Heading>
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
                                    <Text size="xs" tone="muted">
                                        {row.role}
                                    </Text>
                                </TableCell>
                                {canMaintain && (
                                    <TableCell align="end">
                                        <Button
                                            variant="destructive"
                                            disabled={revoking}
                                            aria-busy={revoking || undefined}
                                            onClick={() => revokeInvitation(row.id)}
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
                    onClose={closeInvitation}
                />
            )}
        </>
    );
}
