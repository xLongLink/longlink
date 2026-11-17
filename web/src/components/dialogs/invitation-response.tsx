import { MembershipConfirmation } from '@/components/custom/membership-confirmation';

export function InvitationResponse({
    invitation,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    invitation: { type: 'accept' | 'decline'; name: string };
    onConfirm: () => Promise<void>;
}) {
    return (
        <MembershipConfirmation
            {...dialogProps}
            destructive={invitation.type === 'decline'}
            title={invitation.type === 'accept' ? 'Accept invitation' : 'Decline invitation'}
            description={
                invitation.type === 'accept'
                    ? `Accept the invitation to join ${invitation.name}?`
                    : `Decline the invitation to ${invitation.name}? You will need a new invitation to join.`
            }
            actionLabel={invitation.type === 'accept' ? 'Accept' : 'Decline'}
        />
    );
}
