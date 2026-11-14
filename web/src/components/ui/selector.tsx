import { Picker } from '@/components/custom/picker';
import { useValue } from '@/components/custom/value';
import { FormField } from '@/components/custom/form-field';
import type { FieldProps } from '@/components/custom/types';
import { selectorOptions, type SelectorOptionType } from '@/components/custom/options';

export type { SelectorOptionData, SelectorOptionType } from '@/components/custom/options';

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
