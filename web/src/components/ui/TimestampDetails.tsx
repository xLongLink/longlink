import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { useEffect, useId, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';

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
        <Popover
            open={open}
            triggerId={triggerId}
            onOpenChange={(next, details) => {
                if (!next && details.reason === 'escape-key') suppressFocus.current = true;
                setOpen(next);
            }}
        >
            <PopoverTrigger
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
            <PopoverContent
                side="top"
                className="w-auto max-w-(--available-width)"
                aria-label="Timestamp details"
                initialFocus={false}
            >
                <dl className="m-0 p-0">
                    <dt className="sr-only">{zoneName}</dt>
                    <dd className="m-0 flex items-center gap-4 p-0 whitespace-nowrap">
                        <span>{fullDate}</span>
                        <Button
                            variant="ghost"
                            type="button"
                            size="icon-sm"
                            aria-label={copies > 0 ? 'Copied' : `Copy ${fullDate}`}
                            title={copies > 0 ? 'Copied' : 'Copy'}
                            onClick={() => {
                                void copy();
                            }}
                        >
                            {copies > 0 ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                        </Button>
                    </dd>
                </dl>
                <span className="sr-only" role="status" aria-live="polite">
                    <span key={copies}>{copies > 0 ? 'Copied' : ''}</span>
                </span>
            </PopoverContent>
        </Popover>
    );
}
