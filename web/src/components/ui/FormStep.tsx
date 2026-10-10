import type { ReactNode } from 'react';

/** Groups persistent fields into a direct child step of Form. Form owns progress, validation, and navigation. */
export function FormStep(_props: {
    /** Visible label identifying this step in the progress indicator. */
    label: string;
    /** Fields and layout displayed when this step is active. */
    children?: ReactNode;
}) {
    // Form renders marker children without unmounting inactive fields.
    return null;
}
