import { useValue } from './value';
import { isString } from 'es-toolkit';
import type { ReactNode } from 'react';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import { Icon, type StoneIconName } from './Icon';
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
    value?: string | null;
    defaultValue?: string;
    onChange?: (value: string | null) => void;
    hasSearch?: boolean;
    placeholder?: string;
};

/** Selects one value without custom option rendering or popup geometry. */
export function Selector(props: SelectorProps) {
    // Retain search, option presentation, and clearing while adapting optional local state.
    const { defaultValue, ...control } = props;

    const field = useValue<string | null>(props.value, defaultValue ?? null, props.onChange);

    // Default presentation without overriding the clearable-value callback contract.
    return (
        <FormField {...props} fieldRef={field.ref} values={[field.value ?? '']}>
            <AstryxSelector
                {...control}
                width="100%"
                options={props.options.map((option) => {
                    // Preserve plain labels and dividers without adding a glyph.
                    if (isString(option) || ('type' in option && option.type === 'divider')) return option;

                    // Adapt section glyphs through the same immediate-or-deferred LongLink renderer.
                    if ('type' in option)
                        return {
                            ...option,
                            options: option.options.map((entry) => ({
                                ...entry,
                                icon: entry.icon ? <Icon icon={entry.icon} size="sm" /> : undefined,
                            })),
                        };

                    // Keep the selected value and its menu row on the same icon-loading path.
                    return { ...option, icon: option.icon ? <Icon icon={option.icon} size="sm" /> : undefined };
                })}
                hasClear
                size="md"
                value={field.value}
                onChange={field.onChange}
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
