import { Plug } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { OpenAI } from '@/components/svg/open-ai';
import { useNotification } from '@/lib/notifications';
import { Illustration } from '@/components/ui/illustration';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeButton as Button } from '@/components/custom/native-button';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

export function SolutionMcpDialog({ solutionId, onClose, ...dialogProps }: DialogProps & { solutionId: string }) {
    return (
        <Dialog {...dialogProps} onClose={onClose}>
            <div className="flex h-[min(560px,calc(100dvh-calc(var(--spacing)*10)*4))] min-h-0 min-w-0 overflow-hidden">
                <div className="box-border h-full min-h-0 min-w-0 flex-1 overflow-auto p-8">
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
                                <Heading level={2} className="text-center">
                                    Model Context Protocol
                                </Heading>
                                <p className="text-muted-foreground text-center">Connect your solution to AI tools</p>
                            </Stack>
                        </Stack>
                        <Stack gap={4} width={0} className="min-w-full">
                            <ApiBoundary key={solutionId}>
                                <SolutionMcpUrl solutionId={solutionId} onClose={onClose} />
                            </ApiBoundary>
                            <Button
                                download
                                href={`/api/v1/solutions/${solutionId}/plugin`}
                                label="Download plugin ZIP"
                                variant="default"
                                style={{ width: '100%' }}
                                icon={<OpenAI className="size-5 scale-125" aria-hidden="true" focusable="false" />}
                            />
                        </Stack>
                    </Stack>
                </div>
                <div className="hidden min-w-0 flex-[0_0_50%] overflow-hidden bg-muted md:flex">
                    <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                        <Illustration
                            src="/images/mcp.png"
                            alt="Hand-drawn globe surrounded by orbiting spheres."
                            className="h-full w-full object-contain"
                            width={941}
                            height={1672}
                            decoding="async"
                        />
                    </Stack>
                </div>
            </div>
        </Dialog>
    );
}

function SolutionMcpUrl({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    const showNotification = useNotification();

    const [{ resource }] = useApi(
        `/.well-known/oauth-protected-resource/api/v1/solutions/${solutionId}/proxy/mcp`,
        schemas.zResourceMetadata
    );

    return (
        <Button
            label="Copy MCP server URL"
            variant="outline"
            style={{ width: '100%' }}
            clickAction={async () => {
                await navigator.clipboard.writeText(resource);
                showNotification('Copied');
                onClose();
            }}
        />
    );
}
