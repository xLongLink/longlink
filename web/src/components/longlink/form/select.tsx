import * as fields from './fields';
import { FieldFrame } from './field';
import type { ComponentProps } from 'react';
import * as select from '@/components/shadcn/select';
import type { Select as SelectPrimitive } from '@base-ui/react/select';

/** Owns select composition while preserving single and multiple selection contracts. */
export function Select<Multiple extends boolean = false>({
    options,
    label,
    description,
    error,
    id,
    placeholder,
    size,
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
        SelectPrimitive.Root.Props<string, Multiple>,
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
    > &
    Pick<ComponentProps<typeof select.SelectTrigger>, 'ref' | 'onBlur' | 'onFocus' | 'size'> & {
        options: readonly fields.FormOption[];
        placeholder?: string;
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

    return (
        <FieldFrame
            id={field.id}
            label={label}
            description={description}
            error={error}
            disabled={props.disabled}
            form={props.form}
        >
            <select.Select {...props} items={options}>
                <select.SelectTrigger
                    {...field}
                    ref={ref}
                    onBlur={onBlur}
                    onFocus={onFocus}
                    size={size}
                    className="w-full"
                >
                    <select.SelectValue placeholder={placeholder} />
                </select.SelectTrigger>
                <select.SelectContent>
                    {options.map((option) => (
                        <select.SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                            {option.label}
                        </select.SelectItem>
                    ))}
                </select.SelectContent>
            </select.Select>
        </FieldFrame>
    );
}
