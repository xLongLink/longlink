// LongLink owns shared layout and field contracts; Astryx supplies their implementation.
export type Spacing = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10;
export type FieldProps = {
    label: string;
    description?: string;
    isLabelHidden?: boolean;
    isRequired?: boolean;
    isDisabled?: boolean;
    status?: { type: 'warning' | 'error' | 'success'; message?: string };
    width?: number | string;
};
