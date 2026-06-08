import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { apiUrl, fetchApiText } from '@/lib/api';
import { useEffect, useState } from 'react';

type LogsDialogProps = {
    org: string;
    appId: number;
    appName: string;
};

/** Renders the application logs dialog for an organization. */
export default function LogsDialog({ org, appId, appName }: LogsDialogProps) {
    const [open, setOpen] = useState(false);
    const [logsContent, setLogsContent] = useState('');
    const [logsError, setLogsError] = useState<string | null>(null);
    const [logsLoading, setLogsLoading] = useState(false);

    // Fetch the selected application's pod logs only while the dialog is open.
    useEffect(() => {
        if (!open) {
            return;
        }

        let cancelled = false;

        setLogsLoading(true);
        setLogsError(null);
        setLogsContent('');

        void (async () => {
            try {
                const text = await fetchApiText(
                    apiUrl(`/api/apps/${appId}/logs?organization=${encodeURIComponent(org)}`),
                    {
                        credentials: 'include',
                    }
                );

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
    }, [appId, open, org]);

    return (
        <>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
                Logs
            </Button>

            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    if (!nextOpen) {
                        setLogsContent('');
                        setLogsError(null);
                        setLogsLoading(false);
                    }
                }}
            >
                <DialogContent className="sm:max-w-3xl">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <DialogTitle>Pod logs</DialogTitle>
                            <DialogDescription>Recent logs for {appName}</DialogDescription>
                        </div>

                        {logsLoading ? (
                            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                                Loading logs...
                            </div>
                        ) : logsError ? (
                            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                                {logsError}
                            </div>
                        ) : (
                            <pre className="max-h-[60vh] overflow-auto rounded-md border bg-muted/30 p-3 text-xs leading-5 whitespace-pre-wrap text-foreground">
                                {logsContent || 'No logs available.'}
                            </pre>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
