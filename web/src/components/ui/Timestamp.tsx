import { Timestamp as AstryxTimestamp } from '@astryxdesign/core/Timestamp';

/** Formats a date or timestamp using the standard date formats. */
export function Timestamp(props: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
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
    // Use a stable absolute date and time unless another format is requested.
    return (
        <AstryxTimestamp
            {...props}
            className={props.hidden ? 'hidden!' : undefined}
            hasTooltip={!props.hidden}
            format={props.format ?? 'date_time'}
        />
    );
}
