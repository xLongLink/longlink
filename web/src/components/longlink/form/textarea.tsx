import * as fields from './fields';
import { FieldFrame } from './field';
import type { ComponentProps } from 'react';
import * as textarea from '@/components/shadcn/textarea';

/** Preserves native textarea behavior with automatically associated field feedback. */
export function Textarea({
    label,
    description,
    error,
    ...props
}: Omit<ComponentProps<typeof textarea.Textarea>, 'children' | 'className' | 'style'> & fields.FieldProps) {
    const field = fields.useField({ ...props, label, description, error });

    return (
        <FieldFrame
            id={field.id}
            label={label}
            description={description}
            error={error}
            disabled={props.disabled}
            form={props.form}
        >
            <textarea.Textarea {...props} {...field} className={undefined} style={undefined} />
        </FieldFrame>
    );
}
