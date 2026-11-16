import * as fields from './fields';
import { FieldFrame } from './field';
import type { ComponentProps } from 'react';
import * as toggle from '@/components/shadcn/switch';

/** Presents a labeled boolean control without duplicating checked state. */
export function Switch({
    label,
    description,
    error,
    size = 'md',
    ...props
}: Omit<ComponentProps<typeof toggle.Switch>, 'children' | 'className' | 'style' | 'render' | 'size'> &
    fields.FieldProps & { size?: 'sm' | 'md' }) {
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
            <toggle.Switch
                {...props}
                {...field}
                size={size === 'md' ? 'default' : size}
                className={undefined}
                style={undefined}
                render={undefined}
            />
        </FieldFrame>
    );
}
