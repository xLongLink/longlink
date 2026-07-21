import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Spinner } from '@astryxdesign/core/Spinner';
import { useTranslator } from '@astryxdesign/core/i18n';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { useApiQuery } from '@/hooks/use-api';

/** Parses the application log response. */
function parseLogLines(value: unknown): string[] {
    // The logs endpoint returns one JSON string per log line.
    if (!Array.isArray(value) || !value.every((line) => typeof line === 'string')) {
        throw new Error('Invalid application logs response');
    }

    return value;
}

/** Renders the application logs dialog for an organization. */
export default function Logs({
    applicationId,
    applicationName,
    open,
    onOpenChange,
}: {
    applicationId: string;
    applicationName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useTranslator();
    const logsPath = open ? `/api/applications/${applicationId}/logs` : null;
    const logsQuery = useApiQuery<string[]>(logsPath, { parse: parseLogLines });
    const logLines = open ? (logsQuery.data ?? []) : [];
    const logsLoading = open && logsQuery.isFetching;
    const logsError = open && logsQuery.error ? logsQuery.error.message || t('appView.loadLogsFailed') : null;

    return (
        <Dialog isOpen={open} onOpenChange={onOpenChange} purpose="info" width={768} maxHeight="85vh">
            <Layout
                header={
                    <DialogHeader
                        title={t('dialogs.podLogsTitle')}
                        subtitle={t('appView.logsDescription', { applicationName })}
                        onOpenChange={onOpenChange}
                    />
                }
                content={
                    <LayoutContent>
                        {logsLoading ? (
                            <Stack align="center" padding={6}>
                                <Spinner />
                            </Stack>
                        ) : logsError ? (
                            <Banner status="error" title={logsError} />
                        ) : (
                            <CodeBlock
                                code={logLines.length > 0 ? logLines.join('\n') : t('appView.emptyLogs')}
                                hasCopyButton={false}
                                hasLanguageLabel={false}
                                isWrapped
                                maxHeight="60vh"
                                size="sm"
                                width="100%"
                            />
                        )}
                    </LayoutContent>
                }
            />
        </Dialog>
    );
}
