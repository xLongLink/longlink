import { Dialog } from './dialog';
import { Plug } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { OpenAI } from '@/components/svg/open-ai';
import { useNotification } from '@/lib/notifications';
import { Illustration } from '@/components/ui/illustration';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeButton as Button } from '@/components/ui/native-button';
import { IllustratedDialogContent } from './illustrated-dialog-content';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

export function SolutionMcpDialog({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    return (
        <Dialog isOpen onOpenChange={(open) => !open && onClose()}>
            <IllustratedDialogContent
                illustration={
                    <Illustration
                        src="/images/mcp.png"
                        alt="Hand-drawn globe surrounded by orbiting spheres."
                        className="h-full w-full object-contain"
                        width={941}
                        height={1672}
                        decoding="async"
                    />
                }
            >
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
                            <Text as="p" className="text-muted-foreground text-center">
                                Connect your solution to AI tools
                            </Text>
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
            </IllustratedDialogContent>
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
            style={{ width: '100%' }}
            clickAction={async () => {
                await navigator.clipboard.writeText(resource);
                showNotification('Copied');
                onClose();
            }}
        />
    );
}
