import { api } from '@/lib/api';
import { Stack } from '@astryxdesign/core/Stack';
import { useQuery } from '@tanstack/react-query';
import { Banner } from '@astryxdesign/core/Banner';
import { Spinner } from '@astryxdesign/core/Spinner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { zGetOperationLogsApiV1OperationsOperationIdLogsGetResponse } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the captured terminal logs for one Platform operation. */
export default function OperationLogs({
    operationId,
    operationName,
    onOpenChange,
}: {
    operationId: string;
    operationName: string;
    onOpenChange: (open: boolean) => void;
}) {
    const {
        data: logLines = [],
        error,
        isFetching,
    } = useQuery({
        queryKey: ['api', `/api/v1/operations/${operationId}/logs`],
        queryFn: async ({ signal }) =>
            zGetOperationLogsApiV1OperationsOperationIdLogsGetResponse.parse(
                await api(`/api/v1/operations/${operationId}/logs`, { signal }).json()
            ),
    });

    return (
        <Dialog isOpen onOpenChange={onOpenChange} purpose="info" width={768} maxHeight="85vh">
            <Layout
                header={
                    <DialogHeader
                        title="Operation logs"
                        subtitle={`Captured output for ${operationName}.`}
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
                                code={logLines.length > 0 ? logLines.join('\n') : 'No logs were recorded.'}
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
