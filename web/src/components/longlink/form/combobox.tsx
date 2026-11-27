import { FieldFrame } from './field';
import type * as fields from './fields';
import { useRef, type ComponentProps } from 'react';
import * as combobox from '@/components/shadcn/combobox';
import type { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';

/** Keeps search, keyboard selection, and chips inside a single options-based control. */
export function Combobox<Multiple extends boolean = false>({
    options,
    label,
    description,
    error,
    id,
    placeholder,
    emptyText = 'No results',
    ref,
    onBlur,
    onFocus,
    'aria-label': ariaLabel,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    'aria-invalid': invalid,
    ...props
}: fields.FieldProps &
    Pick<
        ComboboxPrimitive.Root.Props<string, Multiple>,
        | 'name'
        | 'form'
        | 'autoComplete'
        | 'required'
        | 'readOnly'
        | 'disabled'
        | 'multiple'
        | 'value'
        | 'defaultValue'
        | 'onValueChange'
        | 'inputRef'
        | 'inputValue'
        | 'onInputValueChange'
    > &
    Pick<ComponentProps<typeof combobox.ComboboxInput>, 'ref' | 'onBlur' | 'onFocus'> & {
        options: readonly fields.FormOption[];
        placeholder?: string;
        emptyText?: string;
    }) {
    const anchor = useRef<HTMLDivElement | null>(null);

    // Keep the first option authoritative when values repeat.
    const optionsByValue = new Map<string, fields.FormOption>();
    for (const option of options) {
        if (!optionsByValue.has(option.value)) optionsByValue.set(option.value, option);
    }

    return (
        <FieldFrame
            field={{
                id,
                label,
                description,
                error,
                'aria-label': ariaLabel,
                'aria-labelledby': labelledBy,
                'aria-describedby': describedBy,
                'aria-invalid': invalid
            }}
            disabled={props.disabled}
            form={props.form}
        >
            {(field) => (
                <combobox.Combobox
                    {...props}
                    items={options.map((option) => option.value)}
                    itemToStringLabel={(value) => optionsByValue.get(value)?.label ?? value}
                >
                    {props.multiple ? (
                        <combobox.ComboboxChips ref={anchor}>
                            <combobox.ComboboxValue>
                                {(values: string[]) => (
                                    <>
                                        {values.map((value) => {
                                            const option = optionsByValue.get(value);
                                            const label = option?.label ?? value;

                                            return (
                                                <combobox.ComboboxChip key={value} aria-label={label}>
                                                    {label}
                                                </combobox.ComboboxChip>
                                            );
                                        })}
                                        <combobox.ComboboxChipsInput
                                            {...field}
                                            ref={ref}
                                            onBlur={onBlur}
                                            onFocus={onFocus}
                                            placeholder={placeholder}
                                            disabled={props.disabled}
                                        />
                                    </>
                                )}
                            </combobox.ComboboxValue>
                        </combobox.ComboboxChips>
                    ) : (
                        <combobox.ComboboxInput
                            showClear
                            {...field}
                            ref={ref}
                            onBlur={onBlur}
                            onFocus={onFocus}
                            placeholder={placeholder}
                            disabled={props.disabled}
                        />
                    )}
                    <combobox.ComboboxContent anchor={props.multiple ? anchor : undefined}>
                        <combobox.ComboboxEmpty>{emptyText}</combobox.ComboboxEmpty>
                        <combobox.ComboboxList>
                            {(value: string) => {
                                const option = optionsByValue.get(value);
                                if (!option) return null;

                                return (
                                    <combobox.ComboboxItem key={value} value={value} disabled={option.disabled}>
                                        {option.label}
                                    </combobox.ComboboxItem>
                                );
                            }}
                        </combobox.ComboboxList>
                    </combobox.ComboboxContent>
                </combobox.Combobox>
            )}
        </FieldFrame>
    );
}
