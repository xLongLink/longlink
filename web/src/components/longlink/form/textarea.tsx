import { FieldLayout } from './field';
import type * as fields from './fields';
import type { ComponentProps } from 'react';
import * as textarea from '@/components/shadcn/textarea';

/** Preserves native textarea behavior with automatically associated field feedback. */
export function Textarea({
    label,
    description,
    error,
    ...props
}: Omit<ComponentProps<typeof textarea.Textarea>, 'children' | 'className' | 'style'> & fields.FieldProps) {
    return (
        <FieldLayout field={{ ...props, label, description, error }} disabled={props.disabled}>
            {(field) => <textarea.Textarea {...props} {...field} className={undefined} style={undefined} />}
        </FieldLayout>
    );
}
