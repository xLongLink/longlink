import type { ReactNode } from 'react';
import type { FieldProps } from './types';
import { useSize } from '@astryxdesign/core/SizeContext';
import { Selector as AstryxSelector } from '@astryxdesign/core/Selector';

export type SelectorOptionData = {
    value: string;
    label?: string;
    description?: ReactNode;
    icon?: ReactNode;
    disabled?: boolean;
};
export type SelectorOptionType =
    | string
    | SelectorOptionData
    | { type: 'divider' }
    | { type: 'section'; title?: string; options: SelectorOptionData[] };
type SelectorProps = FieldProps & {
    options: SelectorOptionType[];
    hasSearch?: boolean;
    placeholder?: string;
    size?: 'sm' | 'md' | 'lg';
    isReadOnly?: boolean;
    htmlName?: string;
} & (
        | { hasClear?: false; value?: string; onChange?: (value: string) => void }
        | { hasClear: true; value: string | null; onChange?: (value: string | null) => void }
    );

/** Selects one value without custom option rendering or popup geometry. */
export function Selector(props: SelectorProps) {
    // Preserve inherited control sizing before applying the medium fallback.
    const size = useSize(props.size, 'md');

    // Default presentation without overriding the clearable-value callback contract.
    return (
        <AstryxSelector
            {...props}
            size={size}
            placeholder={props.placeholder ?? 'Select...'}
            hasSearch={props.hasSearch ?? false}
            isReadOnly={props.isReadOnly ?? false}
            isLabelHidden={props.isLabelHidden ?? false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}
