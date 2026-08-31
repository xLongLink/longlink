import { api } from '@/lib/api';
import LogDialog from '@/components/dialogs/Log';
import { useQuery } from '@tanstack/react-query';
import { zGetOperationLogsApiV1OperationsOperationIdLogsGetResponse } from '@/lib/generated/platform-api-v1/zod.gen';

const EMPTY_LOG_LINES: readonly string[] = [];

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
        data: logLines = EMPTY_LOG_LINES,
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
        <LogDialog
            emptyMessage="No logs were recorded."
            error={error}
            isFetching={isFetching}
            logLines={logLines}
            onOpenChange={onOpenChange}
            subtitle={`Captured output for ${operationName}.`}
            title="Operation logs"
        />
    );
}
