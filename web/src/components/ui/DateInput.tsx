import type { FieldProps } from './types';
import { useSize } from '@astryxdesign/core/SizeContext';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { DateInput as AstryxDateInput } from '@astryxdesign/core/DateInput';

/** Selects a constrained date with standard month and week presentation. */
export function DateInput(
    props: FieldProps & {
        value?: ISODateString;
        onChange?: (value: ISODateString | undefined) => void;
        min?: ISODateString;
        max?: ISODateString;
        dateConstraints?: readonly ((date: Date) => boolean)[];
        placeholder?: string;
        hasClear?: boolean;
        size?: 'sm' | 'md' | 'lg';
    }
) {
    // Preserve inherited control sizing before applying the medium fallback.
    const size = useSize(props.size, 'md');

    // Start with an editable date field without inventing a selected date or constraints.
    return (
        <AstryxDateInput
            {...props}
            size={size}
            placeholder={props.placeholder ?? 'Select a date'}
            hasClear={props.hasClear ?? false}
            isLabelHidden={false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
            numberOfMonths={1}
            weekStartsOn="sun"
            changeAction={undefined}
            isLoading={false}
        />
    );
}
