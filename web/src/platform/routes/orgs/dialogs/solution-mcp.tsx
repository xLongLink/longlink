import { Plug } from 'lucide-react';
import { useApiError } from '@/lib/errors';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { OpenAI } from '@/components/svg/openai';
import { Button } from '@/components/shadcn/button';
import { useNotification } from '@/lib/notifications';
import { Link } from '@/components/longlink/action/link';
import { Stack } from '@/components/longlink/layout/stack';
import { Dialog } from '@/components/longlink/layout/dialog';
import { useConfirmAction } from '@/lib/hooks/use-confirm-action';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export function SolutionMcpDialog({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            title="Model Context Protocol"
        >
            <Stack gap={4}>
                <Plug className="size-20 self-center text-muted-foreground" aria-hidden="true" />
                <ApiBoundary key={solutionId}>
                    <SolutionMcpUrl solutionId={solutionId} onClose={onClose} />
                </ApiBoundary>
                <Link variant="primary" fullWidth download href={`/api/v1/solutions/${solutionId}/plugin`}>
                    <OpenAI className="size-5 scale-125" aria-hidden="true" focusable="false" />
                    Download plugin ZIP
                </Link>
            </Stack>
        </Dialog>
    );
}

function SolutionMcpUrl({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    const showNotification = useNotification();
    const reportError = useApiError();
    const { isPending, run } = useConfirmAction();

    const [{ resource }] = useApi(
        `/.well-known/oauth-protected-resource/api/v1/solutions/${solutionId}/proxy/mcp`,
        schemas.zResourceMetadata
    );

    return (
        <>
            <Button
                variant="outline"
                className="w-full"
                disabled={isPending}
                aria-busy={isPending || undefined}
                onClick={() => {
                    // Start clipboard access within the user gesture and close only after success.
                    run(async () => {
                        try {
                            await navigator.clipboard.writeText(resource);
                            showNotification('Copied');
                            onClose();
                        } catch (cause) {
                            reportError(cause);
                        }
                    });
                }}
            >
                Copy MCP server URL
            </Button>
            <span role="status" className="sr-only">
                {isPending ? 'Loading' : ''}
            </span>
        </>
    );
}
