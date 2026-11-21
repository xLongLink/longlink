import { cn } from 'cn';
import { TimestampDetails } from './timestamp-details';
import { useState, useSyncExternalStore, type ComponentPropsWithoutRef } from 'react';
import { formatTimestamp, formatRelativeTimestamp, type TimestampFormat } from '@/lib/timestamp';

const subscribe = () => () => {};

const clientClock = () => true;

const serverClock = () => false;

/** Formats a date or timestamp using the standard date formats. */
export function Timestamp({
    value,
    format = 'date_time',
    timeZone,
    className,
    ...props
}: Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
    value: number | string;
    format?: TimestampFormat;
    timeZone?: string;
}) {
    const canReadClock = useSyncExternalStore(subscribe, clientClock, serverClock);
    const [now, setNow] = useState<number | null>(() => (format === 'relative' && canReadClock ? Date.now() : null));

    // Preserve the server's UTC placeholder and switch to relative wording only after hydration.
    // eslint-disable-next-line react/purity -- Seed the client clock once without changing the hydration markup.
    if (format === 'relative' && canReadClock && now === null) setNow(Date.now());

    const date = new Date(typeof value === 'number' && value < 1e12 ? value * 1000 : value);

    if (Number.isNaN(date.getTime())) return null;

    const relative = format === 'relative' && now !== null;
    const text = relative
        ? formatRelativeTimestamp(date, now)
        : formatTimestamp(date, format === 'relative' ? 'date_time' : format, format === 'relative', false, timeZone);

    // Only relative timestamps expose the copyable absolute-date details.
    return (
        <span data-slot="timestamp" {...props} className={cn('text-xs text-muted-foreground', className)}>
            {relative ? (
                <TimestampDetails date={date}>{text}</TimestampDetails>
            ) : (
                <time dateTime={date.toISOString()}>{text}</time>
            )}
        </span>
    );
}
