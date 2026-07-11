import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchApiText } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

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
    const [logsContent, setLogsContent] = useState('');
    const [logsError, setLogsError] = useState<string | null>(null);
    const [logsLoading, setLogsLoading] = useState(false);
    const isControlled = open !== undefined;
    const dialogOpen = isControlled ? open : internalOpen;

    const handleOpenChange = (nextOpen: boolean) => {
        // Mirror open state only for uncontrolled usage.
        if (!isControlled) {
            setInternalOpen(nextOpen);
        }

        onOpenChange?.(nextOpen);

        // Clear logs when the dialog closes.
        if (!nextOpen) {
            setLogsContent('');
            setLogsError(null);
            setLogsLoading(false);
        }
    };

    // Fetch the selected application's pod logs only while the dialog is open.
    useEffect(() => {
        // Skip log fetching while closed.
        if (!dialogOpen) {
            return;
        }

        let cancelled = false;

        setLogsLoading(true);
        setLogsError(null);
        setLogsContent('');

        void (async () => {
            // Fetch logs for the selected application.
            try {
                const text = await fetchApiText(`/api/applications/${applicationId}/logs`);

                // Ignore successful responses after cleanup.
                if (!cancelled) {
                    setLogsContent(text);
                }
            } catch (mutationError) {
                // Ignore errors after cleanup.
                if (!cancelled) {
                    setLogsError(mutationError instanceof Error ? mutationError.message : t('appView.loadLogsFailed'));
                }
            } finally {
                // Stop loading only while still mounted.
                if (!cancelled) {
                    setLogsLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [applicationId, dialogOpen]);

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
                                        {logsContent || t('appView.emptyLogs')}
                                    </pre>
                                </ScrollArea>
                            ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
