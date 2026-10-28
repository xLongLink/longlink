import { useValue } from './value';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { DateInput as AstryxDateInput } from '@astryxdesign/core/DateInput';

/** Selects a constrained date with standard month and week presentation. */
export function DateInput(
    props: FieldProps & {
        value?: ISODateString;
        defaultValue?: ISODateString;
        onChange?: (value: ISODateString | undefined) => void;
        min?: ISODateString;
        max?: ISODateString;
        /** Additional constraints applied to the themed calendar picker. */
        dateConstraints?: readonly ((date: Date) => boolean)[];
        placeholder?: string;
    }
) {
    // Keep optional draft state inside the themed picker and synchronize native form resets.
    const { name, defaultValue, ...control } = props;
    const field = useValue(props.value, defaultValue, props.onChange, Object.hasOwn(props, 'value'));

    // Start with an editable date field without inventing a selected date or constraints.
    return (
        <FormField
            {...control}
            name={name}
            fieldRef={field.ref}
            values={[field.value ?? '']}
            serialize
            error={
                field.value && ((props.min && field.value < props.min) || (props.max && field.value > props.max))
                    ? 'Choose a date within the allowed range.'
                    : undefined
            }
        >
            {/* Only the canonical ISO carrier owns the submission name, not the formatted display input. */}
            <AstryxDateInput
                {...control}
                width="100%"
                value={field.value}
                onChange={field.onChange}
                presentation="adaptive-bottom-sheet"
                placeholder={props.placeholder ?? 'Select a date'}
                hasClear
                size="md"
                isLabelHidden={false}
                isRequired={props.required ?? false}
                isDisabled={props.disabled ?? false}
                numberOfMonths={1}
                weekStartsOn="sun"
                changeAction={undefined}
                isLoading={false}
            />
        </FormField>
    );
}
