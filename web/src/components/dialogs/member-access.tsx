import { useApiError } from '@/lib/errors';
import { Button } from '@/components/shadcn/button';
import { FramedDialog } from '@/components/custom/framed-dialog';
import { useRef, useTransition, type ComponentProps } from 'react';
import { NativeStack as Stack } from '@/components/custom/native-stack';

export function MemberAccess({
    name,
    action,
    onOpenChange,
    onConfirm,
    ...dialogProps
}: Omit<ComponentProps<typeof FramedDialog>, 'children'> & {
    name: string;
    action: { kind: 'role'; role: string } | { kind: 'remove' };
    onConfirm: () => Promise<void>;
}) {
    const reportError = useApiError();
    const inFlight = useRef(false);
    const [pending, startConfirmation] = useTransition();

    return (
        <FramedDialog
            title={action.kind === 'remove' ? 'Remove member' : 'Change role'}
            {...dialogProps}
            onOpenChange={onOpenChange}
        >
            <Stack gap={3}>
                <span className="text-muted-foreground">
                    {action.kind === 'remove'
                        ? `Remove ${name} from this organization? Access is revoked immediately.`
                        : `Change ${name} to ${action.role}?`}
                </span>
                <Stack direction="horizontal" gap={2} justify="end">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
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
        </FramedDialog>
    );
}
