import { useValue } from './value';
import { FormField } from './FormField';
import type { FieldProps } from './types';
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
        hasClear?: boolean;
        hourFormat?: '12h' | '24h';
        increment?: number;
        placeholder?: string;
        size?: 'sm' | 'md' | 'lg';
    }
) {
    // Keep editing and reset state behind Astryx's themed time picker.
    const { defaultValue, ...control } = props;
    const field = useValue(props.value, defaultValue, props.onChange, Object.hasOwn(props, 'value'));

    // Default to minute precision while keeping the selected time controlled by the Solution.
    return (
        <FormField
            {...props}
            fieldRef={field.ref}
            values={[field.value ?? '']}
            serialize
            error={
                field.value && ((props.min && field.value < props.min) || (props.max && field.value > props.max))
                    ? 'Choose a time within the allowed range.'
                    : undefined
            }
        >
            <AstryxTimeInput
                {...control}
                value={field.value}
                onChange={field.onChange}
                presentation="adaptive-bottom-sheet"
                placeholder={props.placeholder ?? 'Select a time'}
                hasSeconds={props.hasSeconds ?? false}
                hasClear={props.hasClear ?? false}
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
