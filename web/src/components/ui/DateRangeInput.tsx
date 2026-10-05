import type { FieldProps } from './types';
import type { DateRange, ISODateString } from '@astryxdesign/core/Calendar';
import { DateRangeInput as AstryxDateRangeInput } from '@astryxdesign/core/DateRangeInput';

/** Selects a date range with two months and standard week presentation. */
export function DateRangeInput(
    props: FieldProps & {
        value: DateRange | null;
        onChange: (value: DateRange | null) => void;
        min?: ISODateString;
        max?: ISODateString;
        dateConstraints?: readonly ((date: Date) => boolean)[];
        minRangeSpan?: number;
        maxRangeSpan?: number;
        placeholder?: string;
        size?: 'sm' | 'md' | 'lg';
        hasClear?: boolean;
    }
) {
    return (
        <AstryxDateRangeInput
            {...props}
            numberOfMonths={2}
            weekStartsOn="sun"
            changeAction={undefined}
            isLoading={false}
        />
    );
}
