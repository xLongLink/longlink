import { Picker } from '../ui/Picker';
import { useValue } from '../ui/value';
import { FormField } from '../ui/FormField';
import type { FieldProps } from '../ui/types';
import { selectorOptions, type SelectorOptionType } from '../ui/options';

export type { SelectorOptionData, SelectorOptionType } from '../ui/options';

type SelectorProps = FieldProps & {
    options: SelectorOptionType[];
    value?: string | null;
    defaultValue?: string;
    onChange?: (value: string | null) => void;
    hasSearch?: boolean;
    hasClear?: boolean;
    placeholder?: string;
};

/** Custom form adapter preserving nullable clear, native reset, and caller-owned rejection of changes. */
export function Selector(props: SelectorProps) {
    // Keep controlled rejection and native reset behavior at the View boundary.
    const field = useValue<string | null>(props.value, props.defaultValue ?? null, props.onChange);

    return (
        <FormField {...props} fieldRef={field.ref} values={[field.value ?? '']} serialize>
            <Picker
                label={props.label}
                description={props.description}
                required={props.required}
                disabled={props.disabled}
                placeholder={props.placeholder}
                hasSearch={props.hasSearch}
                options={selectorOptions(props.options)}
                value={field.value}
                onChange={field.onChange}
                hasClear={props.hasClear ?? true}
            />
        </FormField>
    );
}
