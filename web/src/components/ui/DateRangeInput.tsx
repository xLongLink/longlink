import { useValue } from './value';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import { useSize } from '@astryxdesign/core/SizeContext';
import type { DateRange, ISODateString } from '@astryxdesign/core/Calendar';
import { DateRangeInput as AstryxDateRangeInput } from '@astryxdesign/core/DateRangeInput';

/** Selects a date range with two months and standard week presentation. */
export function DateRangeInput(
    props: FieldProps & {
        value?: DateRange | null;
        defaultValue?: DateRange;
        onChange?: (value: DateRange | null) => void;
        min?: ISODateString;
        max?: ISODateString;
        /** Additional constraints applied to the themed calendar picker. */
        dateConstraints?: readonly ((date: Date) => boolean)[];
        /** Minimum selectable range span. */
        minRangeSpan?: number;
        /** Maximum selectable range span. */
        maxRangeSpan?: number;
        placeholder?: string;
        size?: 'sm' | 'md' | 'lg';
        hasClear?: boolean;
    }
) {
    // Preserve inherited control sizing before applying the medium fallback.
    const size = useSize(props.size, 'md');
    // Preserve the themed range picker and submit endpoints as repeated entries.
    const { defaultValue, ...control } = props;
    const field = useValue(props.value, defaultValue ?? null, props.onChange);

    // Allow clearing the controlled range while leaving date constraints to the Solution.
    return (
        <FormField
            {...props}
            fieldRef={field.ref}
            values={[field.value?.start ?? '', field.value?.end ?? '']}
            serialize
        >
            <AstryxDateRangeInput
                {...control}
                value={field.value}
                onChange={field.onChange}
                size={size}
                placeholder={props.placeholder ?? 'Select date range'}
                hasClear={props.hasClear ?? true}
                isLabelHidden={false}
                isRequired={props.required ?? props.isRequired ?? false}
                isDisabled={(props.disabled ?? props.isDisabled ?? false) || props.readOnly}
                numberOfMonths={2}
                weekStartsOn="sun"
                changeAction={undefined}
                isLoading={false}
            />
        </FormField>
    );
}
