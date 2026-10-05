import type { ReactNode } from 'react';
import type { FieldProps } from './types';
import { ComplexSelector as AstryxComplexSelector } from '@astryxdesign/core/ComplexSelector';

/** Provides custom selection content with one controlled value and standard trigger presentation. */
export function ComplexSelector<Value>(
    props: FieldProps & {
        value: Value;
        onChange?: (value: Value) => void;
        triggerLabel?: ReactNode;
        placeholder?: ReactNode;
        children: (
            value: Value,
            onChange: (value: Value) => void,
            close: () => void,
            state: { isOpen: boolean; isBusy: boolean; triggerId: string; contentId: string }
        ) => ReactNode;
    }
) {
    return <AstryxComplexSelector {...props} changeAction={undefined} isLoading={false} />;
}
