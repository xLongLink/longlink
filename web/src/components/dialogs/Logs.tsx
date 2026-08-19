import { api } from '@/lib/api';
import { Stack } from '@astryxdesign/core/Stack';
import { useQuery } from '@tanstack/react-query';
import { Banner } from '@astryxdesign/core/Banner';
import { Spinner } from '@astryxdesign/core/Spinner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { zGetApplicationLogsApiV1ApplicationsApplicationIdLogsGetResponse } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the application logs dialog for an organization. */
export default function Logs({
    applicationId,
    applicationName,
    onOpenChange,
}: {
    applicationId: string;
    applicationName: string;
    onOpenChange: (open: boolean) => void;
}) {
    const {
        data: logLines = [],
        error,
        isFetching,
    } = useQuery({
        queryKey: ['api', `/api/v1/applications/${applicationId}/logs`],
        queryFn: async ({ signal }) =>
            zGetApplicationLogsApiV1ApplicationsApplicationIdLogsGetResponse.parse(
                await api(`/api/v1/applications/${applicationId}/logs`, { signal }).json()
            ),
    });

    return (
        <Dialog isOpen onOpenChange={onOpenChange} purpose="info" width={768} maxHeight="85vh">
            <Layout
                header={
                    <DialogHeader
                        title="Pod logs"
                        subtitle={`Recent logs for ${applicationName}.`}
                        onOpenChange={onOpenChange}
                    />
                }
                content={
                    <LayoutContent>
                        {isFetching ? (
                            <Stack align="center" padding={6}>
                                <Spinner />
                            </Stack>
                        ) : error ? (
                            <Banner status="error" title={error.message || 'Failed to load logs'} />
                        ) : (
                            <CodeBlock
                                code={logLines.length > 0 ? logLines.join('\n') : 'No logs available.'}
                                hasCopyButton={false}
                                hasLanguageLabel={false}
                                isWrapped
                                maxHeight="60vh"
                                size="sm"
                            />
                        )}
                    </LayoutContent>
                }
            />
        </Dialog>
    );
}
