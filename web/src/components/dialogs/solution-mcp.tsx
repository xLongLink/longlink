import { useApiError } from '@/lib/errors';
import { useApi } from '@/lib/hooks/use-api';
import { useRef, useTransition } from 'react';
import { ApiBoundary } from '@/components/api';
import { OpenAI } from '@/components/svg/openai';
import { useNotification } from '@/lib/notifications';
import { Dialog } from '@/components/longlink/layout/dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Button, buttonVariants } from '@/components/shadcn/button';
import { NativeNavigationLink } from '@/components/custom/native-link';
import { NativeStack as Stack } from '@/components/custom/native-stack';

export function SolutionMcpDialog({
    solutionId,
    onOpenChange,
    ...dialogProps
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    solutionId: string;
}) {
    return (
        <Dialog {...dialogProps} onOpenChange={onOpenChange} title="Model Context Protocol">
            <Stack gap={4}>
                <Plug className="size-20 self-center text-muted-foreground" aria-hidden="true" />
                <ApiBoundary key={solutionId}>
                    <SolutionMcpUrl solutionId={solutionId} onClose={() => onOpenChange(false)} />
                </ApiBoundary>
                <NativeNavigationLink
                    className={buttonVariants({ className: 'w-full' })}
                    download
                    href={`/api/v1/solutions/${solutionId}/plugin`}
                >
                    <OpenAI className="size-5 scale-125" aria-hidden="true" focusable="false" />
                    Download plugin ZIP
                </NativeNavigationLink>
            </Stack>
        </Dialog>
    );
}

function SolutionMcpUrl({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    const showNotification = useNotification();
    const reportError = useApiError();
    const inFlight = useRef(false);
    const [pending, startCopy] = useTransition();

    const [{ resource }] = useApi(
        `/.well-known/oauth-protected-resource/api/v1/solutions/${solutionId}/proxy/mcp`,
        schemas.zResourceMetadata
    );

    return (
        <>
            <Button
                variant="outline"
                className="w-full"
                disabled={pending}
                aria-busy={pending || undefined}
                onClick={() => {
                    // Start clipboard access within the user gesture and close only after success.
                    if (inFlight.current) return;
                    inFlight.current = true;
                    startCopy(async () => {
                        try {
                            await navigator.clipboard.writeText(resource);
                            showNotification('Copied');
                            onClose();
                        } catch (cause) {
                            reportError(cause);
                        } finally {
                            inFlight.current = false;
                        }
                    });
                }}
            >
                Copy MCP server URL
            </Button>
            <span role="status" className="sr-only">
                {pending ? 'Loading' : ''}
            </span>
        </>
    );
}
import { Plug } from 'lucide-react';
