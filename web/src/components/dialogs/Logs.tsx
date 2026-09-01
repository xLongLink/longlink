import { api } from '@/lib/api';
import { Stack } from '@astryxdesign/core/Stack';
import { useQuery } from '@tanstack/react-query';
import { Banner } from '@astryxdesign/core/Banner';
import { Spinner } from '@astryxdesign/core/Spinner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import {
    zGetApplicationLogsApiV1ApplicationsApplicationIdLogsGetResponse,
    zGetOperationLogsApiV1OperationsOperationIdLogsGetResponse,
} from '@/lib/generated/platform-api-v1/zod.gen';

const EMPTY_LOG_LINES: readonly string[] = [];

type LogsProps = {
    kind: 'application' | 'operation';
    onOpenChange: (open: boolean) => void;
    resourceId: string;
};

/** Renders a resource's captured logs in a controlled dialog. */
export default function Logs({ kind, onOpenChange, resourceId }: LogsProps) {
    const isApplication = kind === 'application';
    const details = isApplication
        ? {
              emptyMessage: 'No logs available.',
              title: 'Pod logs',
          }
        : {
              emptyMessage: 'No logs were recorded.',
              title: 'Operation logs',
          };
    const logsPath = isApplication
        ? `/api/v1/applications/${resourceId}/logs`
        : `/api/v1/operations/${resourceId}/logs`;
    const schema = isApplication
        ? zGetApplicationLogsApiV1ApplicationsApplicationIdLogsGetResponse
        : zGetOperationLogsApiV1OperationsOperationIdLogsGetResponse;
    const {
        data: logLines = EMPTY_LOG_LINES,
        error,
        isFetching,
    } = useQuery({
        queryKey: ['api', logsPath],
        queryFn: async ({ signal }) => {
            const response = await api(logsPath, { signal }).json();

            return schema.parse(response);
        },
    });

    return (
        <Dialog isOpen onOpenChange={onOpenChange} width={768} maxHeight="85vh">
            <Layout
                header={<DialogHeader title={details.title} onOpenChange={onOpenChange} />}
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
                                code={logLines.length > 0 ? logLines.join('\n') : details.emptyMessage}
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
