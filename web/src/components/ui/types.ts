// LongLink owns shared layout and field contracts; Astryx supplies their implementation.
export type Spacing = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10;

export type FieldProps = {
    label: string;
    description?: string;
    /** Includes the themed control's value under this form submission name. */
    name?: string;
    /** Requires a value before native form submission. */
    required?: boolean;
    /** Prevents interaction and excludes the field from submission. */
    disabled?: boolean;
    width?: number | string;
};
