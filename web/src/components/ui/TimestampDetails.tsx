import { Check, Copy } from 'lucide-react';
import { Popover } from '@base-ui/react/popover';
import { Button } from '@/components/shadcn/button';
import { useEffect, useId, useRef, useState } from 'react';

/** Shows the relative timestamp's keyboard-accessible, copyable absolute instant. */
export function TimestampDetails({
    children,
    dateTime,
    fullDate,
    label,
    zoneName,
}: {
    children: string;
    dateTime: string;
    fullDate: string;
    label: string;
    zoneName: string;
}) {
    const triggerId = useId();
    const [open, setOpen] = useState(false);
    const [copies, setCopies] = useState(0);
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suppressFocus = useRef(false);
    const mounted = useRef(false);

    // A pending clipboard write must not start a feedback timer after the card unmounts.
    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;

            if (resetTimer.current !== null) clearTimeout(resetTimer.current);
        };
    }, []);

    // Clipboard denial is a silent no-op; only a completed write reports success.
    async function copy() {
        try {
            await navigator.clipboard.writeText(fullDate);
        } catch {
            return;
        }

        if (!mounted.current) return;
        setCopies((previous) => previous + 1);

        if (resetTimer.current !== null) clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setCopies(0), 1500);
    }

    return (
        <Popover.Root
            open={open}
            triggerId={triggerId}
            onOpenChange={(next, details) => {
                if (!next && details.reason === 'escape-key') suppressFocus.current = true;
                setOpen(next);
            }}
        >
            <Popover.Trigger
                id={triggerId}
                nativeButton={false}
                openOnHover
                delay={300}
                closeDelay={200}
                onFocus={() => {
                    if (!suppressFocus.current) setOpen(true);
                }}
                onBlur={() => {
                    suppressFocus.current = false;
                }}
                render={(props) => (
                    <time
                        {...props}
                        className="view-timestamp-trigger"
                        dateTime={dateTime}
                        aria-label={label}
                        role={undefined}
                        aria-haspopup={undefined}
                        aria-expanded={undefined}
                    >
                        {children}
                    </time>
                )}
            />
            <Popover.Portal>
                <Popover.Positioner className="view-typography-positioner" side="top" sideOffset={4}>
                    <Popover.Popup
                        className="view-timestamp-details"
                        aria-label="Timestamp details"
                        initialFocus={false}
                    >
                        <dl className="view-timestamp-row">
                            <dt className="sr-only">{zoneName}</dt>
                            <dd className="view-timestamp-value">
                                <span>{fullDate}</span>
                                <Button
                                    variant="view"
                                    type="button"
                                    data-size="sm"
                                    data-icon-only
                                    data-variant="ghost"
                                    aria-label={copies > 0 ? 'Copied' : `Copy ${fullDate}`}
                                    title={copies > 0 ? 'Copied' : 'Copy'}
                                    onClick={() => {
                                        void copy();
                                    }}
                                >
                                    {copies > 0 ? (
                                        <Check className="view-action-icon" aria-hidden="true" />
                                    ) : (
                                        <Copy className="view-action-icon" aria-hidden="true" />
                                    )}
                                </Button>
                            </dd>
                        </dl>
                        <span className="sr-only" role="status" aria-live="polite">
                            <span key={copies}>{copies > 0 ? 'Copied' : ''}</span>
                        </span>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}
