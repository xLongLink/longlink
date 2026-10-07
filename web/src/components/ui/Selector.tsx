import { useValue } from './value';
import type { ReactNode } from 'react';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import type { StoneIconName } from './Icon';
import { useSize } from '@astryxdesign/core/SizeContext';
import { Selector as AstryxSelector } from '@astryxdesign/core/Selector';

export type SelectorOptionData = {
    value: string;
    label?: string;
    description?: ReactNode;
    icon?: StoneIconName;
    disabled?: boolean;
};
export type SelectorOptionType =
    | string
    | SelectorOptionData
    | { type: 'divider' }
    | { type: 'section'; title?: string; options: SelectorOptionData[] };
type SelectorProps = FieldProps & {
    options: SelectorOptionType[];
    defaultValue?: string;
    hasSearch?: boolean;
    placeholder?: string;
    size?: 'sm' | 'md' | 'lg';
} & (
        | { hasClear?: false; value?: string; onChange?: (value: string) => void }
        | { hasClear: true; value?: string | null; onChange?: (value: string | null) => void }
    );

/** Selects one value without custom option rendering or popup geometry. */
export function Selector(props: SelectorProps) {
    // Preserve inherited control sizing before applying the medium fallback.
    const size = useSize(props.size, 'md');

    // Retain search, option presentation, and clearing while adapting optional local state.
    const { defaultValue, ...control } = props;
    const field = useValue<string | null>(props.value, defaultValue ?? null, (value) => {
        if (props.hasClear) props.onChange?.(value);
        else if (value !== null) props.onChange?.(value);
    });

    // Default presentation without overriding the clearable-value callback contract.
    return (
        <FormField {...props} fieldRef={field.ref} values={[field.value ?? '']}>
            <AstryxSelector
                {...control}
                {...(props.hasClear
                    ? {
                          hasClear: true,
                          value: field.value,
                          onChange: field.onChange,
                      }
                    : {
                          hasClear: false,
                          value: field.value ?? undefined,
                          onChange: field.onChange,
                      })}
                size={size}
                htmlName={props.name}
                placeholder={props.placeholder ?? 'Select...'}
                hasSearch={props.hasSearch ?? false}
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
