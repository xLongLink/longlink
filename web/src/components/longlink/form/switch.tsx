import { FieldFrame } from './field';
import type * as fields from './fields';
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
    return (
        <FieldFrame
            field={{ ...props, label, description, error }}
            disabled={props.disabled}
            form={props.form}
            horizontal
        >
            {(field) => (
                <toggle.Switch
                    {...props}
                    {...field}
                    size={size === 'md' ? 'default' : size}
                    className={undefined}
                    style={undefined}
                    render={undefined}
                />
            )}
        </FieldFrame>
    );
}
