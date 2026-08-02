import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Stack } from '@astryxdesign/core/Stack';
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
    onOpenChange,
}: {
    applicationId: string;
    applicationName: string;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useTranslator();
    const {
        data: logLines = [],
        error,
        isFetching,
    } = useApiQuery<string[]>(`/api/applications/${applicationId}/logs`, {
        parse: parseLogLines,
    });

    return (
        <Dialog isOpen onOpenChange={onOpenChange} purpose="info" width={768} maxHeight="85vh">
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
                        {isFetching ? (
                            <Stack align="center" padding={6}>
                                <Spinner />
                            </Stack>
                        ) : error ? (
                            <Banner status="error" title={error.message || t('appView.loadLogsFailed')} />
                        ) : (
                            <CodeBlock
                                code={logLines.length > 0 ? logLines.join('\n') : t('appView.emptyLogs')}
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
