import { useValue } from './value';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import { compareTime } from '@astryxdesign/core/utils';
import { TimeInput as AstryxTimeInput, type ISOTimeString } from '@astryxdesign/core/TimeInput';

/** Selects a constrained time using the standard picker. */
export function TimeInput(
    props: FieldProps & {
        value?: ISOTimeString;
        defaultValue?: ISOTimeString;
        onChange?: (value: ISOTimeString | undefined) => void;
        min?: ISOTimeString;
        max?: ISOTimeString;
        hasSeconds?: boolean;
        hourFormat?: '12h' | '24h';
        increment?: number;
        placeholder?: string;
    }
) {
    // Keep editing and reset state behind Astryx's themed time picker.
    const { name, defaultValue, ...control } = props;
    const field = useValue(props.value, defaultValue, props.onChange, Object.hasOwn(props, 'value'));

    // Default to minute precision while keeping the selected time controlled by the Solution.
    return (
        <FormField
            {...control}
            name={name}
            fieldRef={field.ref}
            values={[field.value ?? '']}
            serialize
            error={
                field.value &&
                ((props.min && compareTime(field.value, props.min) < 0) ||
                    (props.max && compareTime(field.value, props.max) > 0))
                    ? 'Choose a time within the allowed range.'
                    : undefined
            }
        >
            {/* Only the canonical ISO carrier owns the submission name, not the formatted display input. */}
            <AstryxTimeInput
                {...control}
                width="100%"
                value={field.value}
                onChange={field.onChange}
                presentation="adaptive-bottom-sheet"
                placeholder={props.placeholder ?? 'Select a time'}
                hasSeconds={props.hasSeconds ?? false}
                hasClear
                size="md"
                hourFormat={props.hourFormat ?? '12h'}
                increment={props.increment ?? 1}
                isLabelHidden={false}
                isRequired={props.required ?? false}
                isDisabled={props.disabled ?? false}
                changeAction={undefined}
                isLoading={false}
            />
        </FormField>
    );
}
