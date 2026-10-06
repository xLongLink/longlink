import type { FieldProps } from './types';
import { useSize } from '@astryxdesign/core/SizeContext';
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
    // Preserve inherited control sizing before applying the medium fallback.
    const size = useSize(props.size, 'md');

    // Allow clearing the controlled range while leaving date constraints to the Solution.
    return (
        <AstryxDateRangeInput
            {...props}
            size={size}
            placeholder={props.placeholder ?? 'Select date range'}
            hasClear={props.hasClear ?? true}
            isLabelHidden={props.isLabelHidden ?? false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
            numberOfMonths={2}
            weekStartsOn="sun"
            changeAction={undefined}
            isLoading={false}
        />
    );
}
