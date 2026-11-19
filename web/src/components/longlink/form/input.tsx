import * as fields from './fields';
import { FieldLayout } from './field';
import type { ComponentProps } from 'react';
import * as input from '@/components/shadcn/input';

/** Preserves native input events, refs, constraints, and submission with owned field presentation. */
export function Input({
    label,
    description,
    error,
    ...props
}: Omit<ComponentProps<typeof input.Input>, 'children' | 'className' | 'style'> & fields.FieldProps) {
    const field = fields.useField({ ...props, label, description, error });

    return (
        <FieldLayout id={field.id} label={label} description={description} error={error} disabled={props.disabled}>
            <input.Input {...props} {...field} className={undefined} style={undefined} />
        </FieldLayout>
    );
}
