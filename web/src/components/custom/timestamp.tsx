import { Text } from './text';
import { TimestampDetails } from './timestamp-details';
import { useState, useSyncExternalStore } from 'react';
import { formatTimestamp, formatRelativeTimestamp, type TimestampFormat } from '@/lib/timestamp';

const subscribe = () => () => {};

const clientClock = () => true;

const serverClock = () => false;

/** Formats a date or timestamp using the standard date formats. */
export function Timestamp({ value, format = 'date_time' }: { value: number | string; format?: TimestampFormat }) {
    const canReadClock = useSyncExternalStore(subscribe, clientClock, serverClock);
    const [now, setNow] = useState<number | null>(() => (format === 'relative' && canReadClock ? Date.now() : null));

    // Preserve the server's UTC placeholder and switch to relative wording only after hydration.
    // eslint-disable-next-line react/purity -- Seed the client clock once without changing the hydration markup.
    if (format === 'relative' && canReadClock && now === null) setNow(Date.now());

    // eslint-disable-next-line anti-slop/no-runtime-typeof -- The public input boundary distinguishes Unix timestamps from date strings.
    const date = new Date(typeof value === 'number' && value < 1e12 ? value * 1000 : value);

    if (Number.isNaN(date.getTime())) return null;

    const relative = format === 'relative' && now !== null;
    const fullDate = formatTimestamp(date, 'full');

    const text = relative
        ? formatRelativeTimestamp(date, now)
        : formatTimestamp(date, format === 'relative' ? 'date_time' : format, format === 'relative');

    // Only relative timestamps expose the copyable absolute-date details.
    return (
        <Text className="text-xs text-muted-foreground">
            {relative ? (
                <TimestampDetails
                    dateTime={date.toISOString()}
                    fullDate={fullDate}
                    label={formatTimestamp(date, 'full', false, true)}
                    zoneName={
                        new Intl.DateTimeFormat('en', { timeZoneName: 'long' })
                            .formatToParts(date)
                            .find((part) => part.type === 'timeZoneName')?.value ?? ''
                    }
                >
                    {text}
                </TimestampDetails>
            ) : (
                <time dateTime={date.toISOString()}>{text}</time>
            )}
        </Text>
    );
}
