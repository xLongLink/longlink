import * as fields from './fields';
import { FieldFrame } from './field';
import type { ComponentProps } from 'react';
import * as toggle from '@/components/shadcn/switch';

/** Presents a labeled boolean control without duplicating checked state. */
export function Switch({
    label,
    description,
    error,
    ...props
}: Omit<ComponentProps<typeof toggle.Switch>, 'children' | 'className' | 'style' | 'render'> & fields.FieldProps) {
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
            <toggle.Switch {...props} {...field} className={undefined} style={undefined} render={undefined} />
        </FieldFrame>
    );
}
