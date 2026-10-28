import { useValue } from './value';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import type { SelectorOptionType } from './Selector';
import { MultiSelector as AstryxMultiSelector } from '@astryxdesign/core/MultiSelector';

/** Selects multiple values using standard option and selected-value rendering. */
export function MultiSelector(
    props: FieldProps & {
        options: SelectorOptionType[];
        value?: string[];
        defaultValue?: string[];
        onChange?: (value: string[]) => void;
        placeholder?: string;
        hasSelectAll?: boolean;
        hasSearch?: boolean;
    }
) {
    // Astryx's hidden carriers already preserve repeated names and the themed option picker.
    const { defaultValue, ...control } = props;
    const field = useValue(props.value, defaultValue ?? [], props.onChange);

    // Enable clearing while keeping search and select-all controls opt-in.
    return (
        <FormField {...props} fieldRef={field.ref} values={field.value}>
            <AstryxMultiSelector
                {...control}
                width="100%"
                value={field.value}
                onChange={field.onChange}
                htmlName={props.name}
                placeholder={props.placeholder ?? 'Select...'}
                hasSelectAll={props.hasSelectAll ?? false}
                hasSearch={props.hasSearch ?? false}
                hasClear
                size="md"
                isReadOnly={false}
                isLabelHidden={false}
                isRequired={props.required ?? false}
                isDisabled={props.disabled ?? false}
                changeAction={undefined}
                isLoading={false}
            />
        </FormField>
    );
}
