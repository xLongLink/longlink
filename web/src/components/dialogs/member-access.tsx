import { useApiError } from '@/lib/errors';
import { useRef, useTransition } from 'react';
import { Button } from '@/components/shadcn/button';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';

export function MemberAccess({
    name,
    action,
    onClose,
    onConfirm,
    ...dialogProps
}: DialogProps & {
    name: string;
    action: { kind: 'role'; role: string } | { kind: 'remove' };
    onConfirm: () => Promise<void>;
}) {
    const reportError = useApiError();
    const inFlight = useRef(false);
    const [pending, startConfirmation] = useTransition();

    return (
        <Dialog title={action.kind === 'remove' ? 'Remove member' : 'Change role'} {...dialogProps} onClose={onClose}>
            <Stack gap={3}>
                <span className="text-muted-foreground">
                    {action.kind === 'remove'
                        ? `Remove ${name} from this organization? Access is revoked immediately.`
                        : `Change ${name} to ${action.role}?`}
                </span>
                <Stack direction="horizontal" gap={2} justify="end">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant={action.kind === 'remove' ? 'destructive' : 'default'}
                        disabled={pending}
                        aria-busy={pending || undefined}
                        onClick={() => {
                            // Guard immediate repeated clicks before pending state renders.
                            if (inFlight.current) return;
                            inFlight.current = true;
                            startConfirmation(async () => {
                                try {
                                    await onConfirm();
                                } catch (cause) {
                                    reportError(cause);
                                } finally {
                                    inFlight.current = false;
                                }
                            });
                        }}
                    >
                        {action.kind === 'remove' ? 'Remove member' : 'Confirm'}
                    </Button>
                    <span role="status" className="sr-only">
                        {pending ? 'Loading' : ''}
                    </span>
                </Stack>
            </Stack>
        </Dialog>
    );
}
