import { Picker } from './picker';
import type { ReactNode } from 'react';
import { useValue } from '@/components/custom/value';
import { FormField } from '@/components/custom/form-field';
import type { FieldProps } from '@/components/custom/types';
import { selectorOptions, type SelectorOptionType } from '@/components/custom/options';

/** Selects multiple values while preserving repeated native form entries. */
export function MultiSelector(
    props: FieldProps & {
        options: SelectorOptionType[];
        value?: string[];
        defaultValue?: string[];
        onChange?: (value: string[]) => void;
        placeholder?: string;
        emptyText?: ReactNode;
        triggerDisplay?: 'count' | 'labels' | 'badges';
        hasSelectAll?: boolean;
        hasSearch?: boolean;
    }
) {
    // The View wrapper owns reset and serialization; the primitive owns interaction.
    const field = useValue(props.value, props.defaultValue ?? [], props.onChange);

    return (
        <FormField
            name={props.name}
            required={props.required}
            disabled={props.disabled}
            fieldRef={field.ref}
            values={field.value}
            serialize
            className="view-picker"
            data-multiple
            data-disabled={props.disabled || undefined}
        >
            <Picker
                unwrapped
                label={props.label}
                description={props.description}
                required={props.required}
                disabled={props.disabled}
                placeholder={props.placeholder}
                emptyText={props.emptyText}
                hasSearch={props.hasSearch}
                hasSelectAll={props.hasSelectAll}
                triggerDisplay={props.triggerDisplay}
                multiple
                options={selectorOptions(props.options)}
                value={field.value}
                onChange={field.onChange}
                hasClear
            />
        </FormField>
    );
}
