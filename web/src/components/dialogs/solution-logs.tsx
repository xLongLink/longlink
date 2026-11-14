import { z } from 'zod';
import { RefreshCw } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { FramedDialog } from '@/components/custom/framed-dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeButton as Button } from '@/components/custom/native-button';
import { CodeBlock, CodeBlockContent, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

export function SolutionLogsDialog({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    return (
        <FramedDialog open onOpenChange={(open) => !open && onClose()}>
            <Stack height="min(560px, calc(100dvh - var(--spacing) * 40))" paddingInline={8} paddingBlock={4}>
                <ApiBoundary key={solutionId}>
                    <SolutionLogs solutionId={solutionId} onClose={onClose} />
                </ApiBoundary>
            </Stack>
        </FramedDialog>
    );
}

function SolutionLogs({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    const [logs, invalidate] = useApi(`/api/v1/solutions/${solutionId}/logs`, z.array(z.string()));

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
                <Button label="Close" variant="ghost" onClick={onClose} />
                <Button
                    label="Refresh logs"
                    variant="outline"
                    icon={<RefreshCw className="size-4" aria-hidden="true" />}
                    clickAction={invalidate}
                />
            </Stack>
        </Stack>
    );
}
