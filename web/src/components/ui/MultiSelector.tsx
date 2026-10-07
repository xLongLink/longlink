import { useValue } from './value';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import type { SelectorOptionType } from './Selector';
import { useSize } from '@astryxdesign/core/SizeContext';
import { MultiSelector as AstryxMultiSelector } from '@astryxdesign/core/MultiSelector';

/** Selects multiple values using standard option and selected-value rendering. */
export function MultiSelector(
    props: FieldProps & {
        options: SelectorOptionType[];
        value?: string[];
        defaultValue?: string[];
        onChange?: (value: string[]) => void;
        placeholder?: string;
        size?: 'sm' | 'md' | 'lg';
        hasSelectAll?: boolean;
        hasSearch?: boolean;
        hasClear?: boolean;
    }
) {
    // Preserve inherited control sizing before applying the medium fallback.
    const size = useSize(props.size, 'md');

    // Astryx's hidden carriers already preserve repeated names and the themed option picker.
    const { defaultValue, ...control } = props;
    const field = useValue(props.value, defaultValue ?? [], props.onChange);

    // Start with a plain multi-select; extra controls remain opt-in.
    return (
        <FormField {...props} fieldRef={field.ref} values={field.value}>
            <AstryxMultiSelector
                {...control}
                value={field.value}
                onChange={field.onChange}
                htmlName={props.name}
                size={size}
                placeholder={props.placeholder ?? 'Select...'}
                hasSelectAll={props.hasSelectAll ?? false}
                hasSearch={props.hasSearch ?? false}
                hasClear={props.hasClear ?? false}
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
