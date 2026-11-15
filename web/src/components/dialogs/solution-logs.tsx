import { z } from 'zod';
import { RefreshCw } from 'lucide-react';
import { useApiError } from '@/lib/errors';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { Button } from '@/components/shadcn/button';
import { FramedDialog } from '@/components/custom/framed-dialog';
import { useRef, useTransition, type ComponentProps } from 'react';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { CodeBlock, CodeBlockContent, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

export function SolutionLogsDialog({
    solutionId,
    onOpenChange,
    ...dialogProps
}: Omit<ComponentProps<typeof FramedDialog>, 'children'> & { solutionId: string }) {
    return (
        <FramedDialog {...dialogProps} onOpenChange={onOpenChange}>
            <Stack height="min(560px, calc(100dvh - var(--spacing) * 40))" paddingInline={8} paddingBlock={4}>
                <ApiBoundary key={solutionId}>
                    <SolutionLogs solutionId={solutionId} onClose={() => onOpenChange(false)} />
                </ApiBoundary>
            </Stack>
        </FramedDialog>
    );
}

function SolutionLogs({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    const [logs, invalidate] = useApi(`/api/v1/solutions/${solutionId}/logs`, z.array(z.string()));
    const reportError = useApiError();
    const inFlight = useRef(false);
    const [pending, startRefresh] = useTransition();

    return (
        <Stack gap={3} height="100%">
            <div className="min-h-0 min-w-0 grow">
                <CodeBlock code={logs.join('\n')} showLineNumbers wrap className="h-full">
                    <CodeBlockCopyButton />
                    <div
                        className="min-h-0 flex-1 overflow-auto"
                        role="region"
                        aria-label="Deployment logs"
                        tabIndex={0}
                    >
                        <CodeBlockContent />
                    </div>
                </CodeBlock>
            </div>
            <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                <Button variant="ghost" onClick={onClose}>
                    Close
                </Button>
                <Button
                    variant="outline"
                    disabled={pending}
                    aria-busy={pending || undefined}
                    onClick={() => {
                        // Keep one refresh active until invalidation finishes.
                        if (inFlight.current) return;
                        inFlight.current = true;
                        startRefresh(async () => {
                            try {
                                await invalidate();
                            } catch (cause) {
                                reportError(cause);
                            } finally {
                                inFlight.current = false;
                            }
                        });
                    }}
                >
                    <RefreshCw className="size-4" aria-hidden="true" />
                    Refresh logs
                </Button>
                <span role="status" className="sr-only">
                    {pending ? 'Loading' : ''}
                </span>
            </Stack>
        </Stack>
    );
}
