import { Picker } from './Picker';
import { useValue } from './value';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import { selectorOptions, type SelectorOptionType } from './options';

export type { SelectorOptionData, SelectorOptionType } from './options';

type SelectorProps = FieldProps & {
    options: SelectorOptionType[];
    value?: string | null;
    defaultValue?: string;
    onChange?: (value: string | null) => void;
    hasSearch?: boolean;
    hasClear?: boolean;
    placeholder?: string;
};

/** Selects one value with optional filtering and caller-owned nullable state. */
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
