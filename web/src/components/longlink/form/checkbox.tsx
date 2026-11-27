import { FieldFrame } from './field';
import type * as fields from './fields';
import type { ComponentProps } from 'react';
import * as checkbox from '@/components/shadcn/checkbox';

/** Keeps checked state and native form participation inside the installed checkbox. */
export function Checkbox({
    label,
    description,
    error,
    ...props
}: Omit<ComponentProps<typeof checkbox.Checkbox>, 'children' | 'className' | 'style' | 'render'> & fields.FieldProps) {
    return (
        <FieldFrame
            field={{ ...props, label, description, error }}
            disabled={props.disabled}
            form={props.form}
            horizontal
        >
            {(field) => (
                <checkbox.Checkbox {...props} {...field} className={undefined} style={undefined} render={undefined} />
            )}
        </FieldFrame>
    );
}
