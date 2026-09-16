import { z } from 'zod';
import { api } from '@/lib/api';
import type { Props } from '@/xml/types';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { useQuery } from '@tanstack/react-query';
import { useXmlRuntime } from '@/xml/core/context';
import { resolveXmlProps } from '@/xml/core/props';
import { Banner } from '@astryxdesign/core/Banner';
import { Spinner } from '@astryxdesign/core/Spinner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { coerceXmlBoolean, useBindableValue } from '@/xml/core/binding';
import { zGetSolutionLogsApiV1SolutionsSolutionIdLogsGetResponse } from '@/lib/generated/platform-api-v1/zod.gen';

const solutionLogsPropsSchema = z.object({ solutionId: z.string().uuid() });
const EMPTY_LOG_LINES: readonly string[] = [];

/** Renders a Solution log viewer controlled by an XML dialog binding. */
export function SolutionLogs({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { solutionId } = resolveXmlProps(props, ctx, solutionLogsPropsSchema);
    const binding = useBindableValue(props, 'isOpen', ctx, coerceXmlBoolean);
    const logsPath = `/api/v1/solutions/${solutionId}/logs`;
    const {
        data: logLines = EMPTY_LOG_LINES,
        error,
        isFetching,
    } = useQuery({
        queryKey: ['api', logsPath],
        queryFn: async ({ signal }) =>
            zGetSolutionLogsApiV1SolutionsSolutionIdLogsGetResponse.parse(await api(logsPath, { signal }).json()),
        enabled: binding.value,
    });

    if (!binding.value) return null;

    return (
        <Dialog isOpen title="Pod logs" onOpenChange={binding.setValue} width={768} maxHeight="85vh">
            {isFetching ? (
                <Stack align="center" padding={6}>
                    <Spinner />
                </Stack>
            ) : error ? (
                <Banner status="error" title="Failed to load logs" />
            ) : (
                <CodeBlock
                    code={logLines.length > 0 ? logLines.join('\n') : 'No logs available.'}
                    isWrapped
                    maxHeight="60vh"
                    size="sm"
                />
            )}
        </Dialog>
    );
}
