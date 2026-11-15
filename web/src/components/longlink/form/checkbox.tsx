import * as fields from './fields';
import { FieldFrame } from './field';
import type { ComponentProps } from 'react';
import * as checkbox from '@/components/shadcn/checkbox';

/** Keeps checked state and native form participation inside the installed checkbox. */
export function Checkbox({
    label,
    description,
    error,
    ...props
}: Omit<ComponentProps<typeof checkbox.Checkbox>, 'children' | 'className' | 'style' | 'render'> & fields.FieldProps) {
    const field = fields.useField({ ...props, label, description, error });

    return (
        <FieldFrame
            id={field.id}
            label={label}
            description={description}
            error={error}
            disabled={props.disabled}
            form={props.form}
            horizontal
        >
            <checkbox.Checkbox {...props} {...field} className={undefined} style={undefined} render={undefined} />
        </FieldFrame>
    );
}
