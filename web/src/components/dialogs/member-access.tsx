import { MembershipConfirmation } from './membership-confirmation';

export function MemberAccess({
    name,
    action,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    name: string;
    action: { kind: 'role'; role: string } | { kind: 'remove' };
    onConfirm: () => Promise<void>;
}) {
    return (
        <MembershipConfirmation
            {...dialogProps}
            destructive={action.kind === 'remove'}
            title={action.kind === 'remove' ? 'Remove member' : 'Change role'}
            description={
                action.kind === 'remove'
                    ? `Remove ${name} from this organization? Access is revoked immediately.`
                    : `Change ${name} to ${action.role}?`
            }
            actionLabel={action.kind === 'remove' ? 'Remove member' : 'Confirm'}
        />
    );
}
