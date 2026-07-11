import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useApiQuery } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
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
    trigger,
}: {
    applicationId: string;
    applicationName: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: ReactNode | null;
}) {
    const { t } = useTranslation();
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = open !== undefined;
    const dialogOpen = isControlled ? open : internalOpen;
    const logsPath = dialogOpen ? `/api/applications/${applicationId}/logs` : null;
    const logsQuery = useApiQuery<string[]>(logsPath, { parse: parseLogLines });
    const logLines = dialogOpen ? (logsQuery.data ?? []) : [];
    const logsLoading = dialogOpen && logsQuery.isFetching;
    const logsError = dialogOpen && logsQuery.error ? logsQuery.error.message || t('appView.loadLogsFailed') : null;

    const handleOpenChange = (nextOpen: boolean) => {
        // Mirror open state only for uncontrolled usage.
        if (!isControlled) {
            setInternalOpen(nextOpen);
        }

        onOpenChange?.(nextOpen);
    };

    return (
        <>
            {trigger === null
                ? null
                : (trigger ?? (
                      <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
                          {t('dialogs.logs')}
                      </Button>
                  ))}

            <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
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
        </>
    );
}
