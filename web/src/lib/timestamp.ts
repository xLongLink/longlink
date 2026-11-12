export type TimestampFormat =
    | 'date'
    | 'date_long'
    | 'date_weekday'
    | 'date_time'
    | 'time'
    | 'relative'
    | 'system_date'
    | 'system_date_time'
    | 'system_time';

/** Formats fixed instants in the viewer's zone, using the View's English/Gregorian defaults. */
export function formatTimestamp(
    date: Date,
    format: Exclude<TimestampFormat, 'relative'> | 'full',
    utc = false,
    longZone = false
) {
    // Keep system formats independent of locale and based on the viewer's local clock.
    const pad = (value: number) => String(value).padStart(2, '0');
    const systemDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const systemTime = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

    if (format === 'system_date') return systemDate;

    if (format === 'system_time') return systemTime;

    if (format === 'system_date_time') return `${systemDate} ${systemTime}`;

    // Match the absolute date options used by the former renderer, including tooltip seconds and zone.
    const options: Intl.DateTimeFormatOptions = { calendar: 'gregory' };

    if (format !== 'time') {
        options.year = 'numeric';
        options.month = format === 'date_long' || format === 'full' ? 'long' : 'short';
        options.day = 'numeric';
    }

    if (format === 'date_weekday') options.weekday = 'short';

    if (format === 'time' || format === 'date_time' || format === 'full') {
        options.hour = 'numeric';
        options.minute = '2-digit';
    }

    if (format === 'full') {
        options.second = '2-digit';
        options.timeZoneName = longZone ? 'long' : 'short';
    }

    if (utc) {
        options.timeZone = 'UTC';
        options.timeZoneName = 'short';
    }

    return new Intl.DateTimeFormat('en', options).format(date);
}

/** Uses the original relative-time tiers, including future clock-skew tolerance and yesterday. */
export function formatRelativeTimestamp(date: Date, now: number) {
    const seconds = Math.round((now - date.getTime()) / 1000);
    const difference = Math.abs(seconds);

    if (difference < 10 || (seconds < 0 && difference <= 30)) {
        return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(0, 'second');
    }

    // Use fixed-duration month/year tiers rather than calendar-boundary rounding.
    const [duration, unit]: readonly [number, Intl.RelativeTimeFormatUnit] =
        difference < 60
            ? [1, 'second']
            : difference < 3600
              ? [60, 'minute']
              : difference < 86400
                ? [3600, 'hour']
                : difference < 2592000
                  ? [86400, 'day']
                  : difference < 31536000
                    ? [2592000, 'month']
                    : [31536000, 'year'];

    const count = Math.floor(difference / duration) * (seconds < 0 ? 1 : -1);

    return new Intl.RelativeTimeFormat('en', { numeric: unit === 'day' && count === -1 ? 'auto' : 'always' }).format(
        count,
        unit
    );
}
