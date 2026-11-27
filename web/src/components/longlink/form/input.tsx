import { FieldLayout } from './field';
import type * as fields from './fields';
import type { ComponentProps } from 'react';
import * as input from '@/components/shadcn/input';

/** Preserves native input events, refs, constraints, and submission with owned field presentation. */
export function Input({
    label,
    description,
    error,
    ...props
}: Omit<ComponentProps<typeof input.Input>, 'children' | 'className' | 'style'> & fields.FieldProps) {
    return (
        <FieldLayout field={{ ...props, label, description, error }} disabled={props.disabled}>
            {(field) => <input.Input {...props} {...field} className={undefined} style={undefined} />}
        </FieldLayout>
    );
}
