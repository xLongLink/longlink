import { Calendar as AstryxCalendar } from '@astryxdesign/core/Calendar';
import type { DateRange, ISODateString } from '@astryxdesign/core/Calendar';

type CalendarProps = {
    className?: string;
    min?: ISODateString;
    max?: ISODateString;
    dateConstraints?: readonly ((date: Date) => boolean)[];
    minRangeSpan?: number;
    maxRangeSpan?: number;
} & (
    | {
          mode?: 'single';
          value?: ISODateString;
          onChange?: (value: ISODateString) => void;
      }
    | {
          mode: 'range';
          value?: DateRange;
          onChange?: (value: DateRange) => void;
      }
);

/** Standardizes calendar presentation while Astryx owns selection and month navigation. */
export function Calendar(props: CalendarProps) {
    // Expose only the ISO string when Astryx also supplies a native Date for single selection.
    const selectionProps =
        props.mode === 'range' ? props : { ...props, onChange: (value: ISODateString) => props.onChange?.(value) };

    // Keep month count mode-specific and prevent callers from overriding shared presentation.
    return (
        <AstryxCalendar
            {...selectionProps}
            numberOfMonths={props.mode === 'range' ? 2 : 1}
            hasOutsideDays
            hasWeekNumbers={false}
            hasVariableRowCount={false}
            weekStartsOn="sun"
            handleRef={undefined}
            defaultValue={undefined}
            focusDate={undefined}
            onFocusDateChange={undefined}
        />
    );
}
