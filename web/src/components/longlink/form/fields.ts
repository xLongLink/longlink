import type { AriaAttributes } from 'react';

export type FieldProps = Pick<
    AriaAttributes,
    'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'aria-invalid'
> & { id?: string; label?: string; description?: string; error?: string };

export type FormOption = { value: string; label: string; disabled?: boolean };
