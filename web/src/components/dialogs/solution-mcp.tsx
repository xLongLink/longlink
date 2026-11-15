import { Plug } from 'lucide-react';
import { useApiError } from '@/lib/errors';
import { useApi } from '@/lib/hooks/use-api';
import { useRef, useTransition } from 'react';
import { ApiBoundary } from '@/components/api';
import { OpenAI } from '@/components/svg/open-ai';
import { useNotification } from '@/lib/notifications';
import { Dialog } from '@/components/custom/native-dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Button, buttonVariants } from '@/components/shadcn/button';
import { NativeNavigationLink } from '@/components/custom/native-link';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DialogContent, DialogTitle } from '@/components/shadcn/dialog';

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
        <Dialog {...dialogProps} onOpenChange={onOpenChange}>
            <DialogContent>
                <div className="flex max-h-[80dvh] min-h-0 min-w-0 overflow-auto">
                    <div className="min-h-0 min-w-0 flex-1">
                        <Stack
                            minHeight="100%"
                            justify="center"
                            width="max-content"
                            maxWidth="100%"
                            gap={6}
                            className="mx-auto"
                        >
                            <Stack gap={2} align="center">
                                <Plug className="size-20 text-muted-foreground" aria-hidden="true" />
                                <Stack gap={0}>
                                    <DialogTitle>Model Context Protocol</DialogTitle>
                                    <p className="text-muted-foreground text-center">
                                        Connect your solution to AI tools
                                    </p>
                                </Stack>
                            </Stack>
                            <Stack gap={4} width={0} className="min-w-full">
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
                        </Stack>
                    </div>
                </div>
            </DialogContent>
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
