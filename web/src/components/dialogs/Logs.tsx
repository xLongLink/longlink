import { useTranslation } from '@/lib/i18n';
import { useApiQuery } from '@/hooks/use-api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

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
    const { t } = useTranslation();
    const logsPath = open ? `/api/applications/${applicationId}/logs` : null;
    const logsQuery = useApiQuery<string[]>(logsPath, { parse: parseLogLines });
    const logLines = open ? (logsQuery.data ?? []) : [];
    const logsLoading = open && logsQuery.isFetching;
    const logsError = open && logsQuery.error ? logsQuery.error.message || t('appView.loadLogsFailed') : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <DialogTitle>{t('dialogs.podLogsTitle')}</DialogTitle>
                        <DialogDescription>{t('appView.logsDescription', { applicationName })}</DialogDescription>
                    </div>

                    {!logsLoading &&
                        (logsError ? (
                            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                                {logsError}
                            </div>
                        ) : (
                            <ScrollArea className="h-[60vh] overflow-hidden rounded-md border bg-muted/30">
                                <pre className="p-3 text-xs leading-5 whitespace-pre-wrap text-foreground">
                                    {logLines.length > 0 ? logLines.join('\n') : t('appView.emptyLogs')}
                                </pre>
                            </ScrollArea>
                        ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
