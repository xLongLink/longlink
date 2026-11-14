import { normalizeDigits } from './digits';
import { format, isValid, parse, parseISO } from 'date-fns';

export type ISODateString = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

export type ISOTimeString = string & { readonly __brand: 'ISOTimeString' };

/** Reads calendar dates without JavaScript's invalid-day rollover. */
export function readDate(text: string): ISODateString | null {
    const input = text.trim().replace(/,/g, '').replace(/\s+/g, ' ');
    const numeric = /^(\d{1,2})([-/.])(\d{1,2})(?:\2(\d{4}))?$/.exec(input);

    const formats = [
        'yyyy-M-d',
        'yyyy/M/d',
        'yyyy.M.d',
        'MMMM d yyyy',
        'MMM d yyyy',
        'd MMMM yyyy',
        'd MMM yyyy',
        'EEE MMM d yyyy',
        'EEEE MMMM d yyyy',
        'EEE d MMM yyyy',
        'EEEE d MMMM yyyy',
        'MMMM d',
        'MMM d',
        'd MMMM',
        'd MMM'
    ];

    // Match the existing English month-first default, swapping only an unambiguous day.
    if (numeric) {
        const first = Number(numeric[1]);
        const second = Number(numeric[3]);
        const reversed = first > 12;

        const date = parse(
            `${numeric[4] ?? new Date().getFullYear()}-${reversed ? second : first}-${reversed ? first : second}`,
            'yyyy-M-d',
            new Date()
        );

        // SAFETY: date-fns validates calendar days and formats canonical four-digit-year dates.
        return isValid(date) ? (format(date, 'yyyy-MM-dd') as ISODateString) : null;
    }

    for (const pattern of formats) {
        const date = parse(input, pattern, new Date());

        if (isValid(date) && date.getFullYear() > 0 && date.getFullYear() <= 9999) {
            // SAFETY: The valid calendar date and bounded year produce the ISODateString shape.
            return format(date, 'yyyy-MM-dd') as ISODateString;
        }
    }

    return null;
}

/** Checks canonical dates separately from permissive typed date formats. */
export function validDate(value: string): value is ISODateString {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && readDate(value) === value;
}

/** Formats a previously validated ISO date in the incumbent long-month presentation. */
export function displayDate(value: ISODateString) {
    return format(parseISO(value), 'MMMM d, yyyy');
}

/** Reads 24-hour, compact, and AM/PM text with strict hour/minute/second ranges. */
export function readTime(text: string, seconds = false): ISOTimeString | null {
    const normalized = normalizeDigits(text);

    if (normalized === null) return null;
    const input = normalized.toLowerCase().replace(/(\d)\s*:\s*(?=\d)/g, '$1:');
    const suffix = /\s*([ap])\.?m?\.?$/.exec(input);
    const clock = suffix ? input.slice(0, suffix.index) : input;
    const match = /^(\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?$/.exec(clock);
    const compact = /^(\d{2})(\d{2})(\d{2})?$/.exec(clock);

    if (!match && !compact) return null;
    let hour = Number(match?.[1] ?? compact?.[1]);
    const minute = Number(match?.[2] ?? compact?.[2] ?? 0);
    const second = Number(match?.[3] ?? compact?.[3] ?? 0);
    const period = suffix?.[1];

    if (period && (hour < 1 || hour > 12)) return null;

    if (period) hour = (hour % 12) + (period.startsWith('p') ? 12 : 0);

    if (hour > 23 || minute > 59 || second > 59) return null;

    // SAFETY: All time parts are range-checked integers before canonical formatting.
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}${seconds ? `:${String(second).padStart(2, '0')}` : ''}` as ISOTimeString;
}

/** Compares time bounds in seconds, treating omitted seconds as zero. */
export function timeSeconds(value: string) {
    if (!/^\d{2}:\d{2}(?::\d{2})?$/.test(value)) return NaN;
    const [hour, minute, second = 0] = value.split(':').map(Number);

    return hour < 24 && minute < 60 && second < 60 ? hour * 3600 + minute * 60 + second : NaN;
}

/** Converts whole seconds since midnight to the requested canonical time precision. */
export function timeFromSeconds(value: number, seconds: boolean) {
    return readTime(`${Math.floor(value / 3600)}:${Math.floor((value % 3600) / 60)}:${value % 60}`, seconds);
}

/** Formats a canonical time without changing its stored precision. */
export function displayTime(value: ISOTimeString, seconds: boolean, hourFormat: '12h' | '24h') {
    const [hour, minute, second = '00'] = value.split(':');
    const clock = hourFormat === '12h' ? String(Number(hour) % 12 || 12) : hour;

    return `${clock}:${minute}${seconds ? `:${second}` : ''}${hourFormat === '12h' ? (Number(hour) < 12 ? ' AM' : ' PM') : ''}`;
}
