import { api } from '@/lib/api';
import LogDialog from '@/components/dialogs/Log';
import { useQuery } from '@tanstack/react-query';
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
        <LogDialog
            emptyMessage="No logs available."
            error={error}
            isFetching={isFetching}
            logLines={logLines}
            onOpenChange={onOpenChange}
            subtitle={`Recent logs for ${applicationName}.`}
            title="Pod logs"
        />
    );
}
