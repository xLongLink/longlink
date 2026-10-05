import { Timestamp as AstryxTimestamp } from '@astryxdesign/core/Timestamp';

/** Formats a date or timestamp using the standard date formats. */
export function Timestamp(props: {
    value: number | string;
    format?:
        | 'date'
        | 'date_long'
        | 'date_weekday'
        | 'date_time'
        | 'time'
        | 'relative'
        | 'system_date'
        | 'system_date_time'
        | 'system_time';
}) {
    return <AstryxTimestamp {...props} />;
}
