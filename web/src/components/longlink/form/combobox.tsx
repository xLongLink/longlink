import * as fields from './fields';
import { FieldFrame } from './field';
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
    const field = fields.useField({
        id,
        label,
        description,
        error,
        'aria-label': ariaLabel,
        'aria-labelledby': labelledBy,
        'aria-describedby': describedBy,
        'aria-invalid': invalid
    });
    const anchor = useRef<HTMLDivElement | null>(null);

    return (
        <FieldFrame
            id={field.id}
            label={label}
            description={description}
            error={error}
            disabled={props.disabled}
            form={props.form}
        >
            <combobox.Combobox
                {...props}
                items={options.map((option) => option.value)}
                itemToStringLabel={(value) => options.find((option) => option.value === value)?.label ?? value}
            >
                {props.multiple ? (
                    <combobox.ComboboxChips ref={anchor}>
                        <combobox.ComboboxValue>
                            {(values: string[]) => (
                                <>
                                    {values.map((value) => {
                                        const option = options.find((option) => option.value === value);
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
                            const option = options.find((item) => item.value === value);
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
        </FieldFrame>
    );
}
