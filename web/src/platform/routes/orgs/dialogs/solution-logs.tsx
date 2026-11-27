import { z } from 'zod';
import { RefreshCw } from 'lucide-react';
import { ApiBoundary } from '@/components/api';
import { apiQueryOptions } from '@/lib/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Stack } from '@/components/longlink/layout/stack';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { CodeBlock, CodeBlockContent, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

export function SolutionLogsDialog({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            title="Solution logs"
        >
            <ApiBoundary key={solutionId}>
                <SolutionLogs solutionId={solutionId} onClose={onClose} />
            </ApiBoundary>
        </Dialog>
    );
}

function SolutionLogs({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    const {
        data: logs,
        isFetching,
        refetch
    } = useSuspenseQuery(apiQueryOptions(`/api/v1/solutions/${solutionId}/logs`, z.array(z.string())));

    return (
        <Stack gap={3} className="h-full">
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
                    disabled={isFetching}
                    aria-busy={isFetching || undefined}
                    onClick={() => {
                        // Join an active refresh; the query cache reports failures.
                        void refetch({ cancelRefetch: false });
                    }}
                >
                    <RefreshCw className="size-4" aria-hidden="true" />
                    Refresh logs
                </Button>
                <span role="status" className="sr-only">
                    {isFetching ? 'Loading' : ''}
                </span>
            </Stack>
        </Stack>
    );
}
