import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchApiText } from '@/lib/api';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

type LogsDialogProps = {
    applicationId: string;
    applicationName: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: ReactNode | null;
};

/** Renders the application logs dialog for an organization. */
export default function LogsDialog({ applicationId, applicationName, open, onOpenChange, trigger }: LogsDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [logsContent, setLogsContent] = useState('');
    const [logsError, setLogsError] = useState<string | null>(null);
    const [logsLoading, setLogsLoading] = useState(false);
    const isControlled = open !== undefined;
    const dialogOpen = isControlled ? open : internalOpen;

    const handleOpenChange = (nextOpen: boolean) => {
        if (!isControlled) {
            setInternalOpen(nextOpen);
        }

        onOpenChange?.(nextOpen);

        if (!nextOpen) {
            setLogsContent('');
            setLogsError(null);
            setLogsLoading(false);
        }
    };

    // Fetch the selected application's pod logs only while the dialog is open.
    useEffect(() => {
        if (!dialogOpen) {
            return;
        }

        let cancelled = false;

        setLogsLoading(true);
        setLogsError(null);
        setLogsContent('');

        void (async () => {
            try {
                const text = await fetchApiText(`/api/applications/${applicationId}/logs`);

                if (!cancelled) {
                    setLogsContent(text);
                }
            } catch (mutationError) {
                if (!cancelled) {
                    setLogsError(mutationError instanceof Error ? mutationError.message : 'Failed to load logs');
                }
            } finally {
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
                          Logs
                      </Button>
                  ))}

            <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-3xl">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <DialogTitle>Pod logs</DialogTitle>
                            <DialogDescription>Recent logs for {applicationName}</DialogDescription>
                        </div>

                        {!logsLoading &&
                            (logsError ? (
                                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                                    {logsError}
                                </div>
                            ) : (
                                <ScrollArea className="h-[60vh] overflow-hidden rounded-md border bg-muted/30">
                                    <pre className="p-3 text-xs leading-5 whitespace-pre-wrap text-foreground">
                                        {logsContent || 'No logs available.'}
                                    </pre>
                                </ScrollArea>
                            ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
