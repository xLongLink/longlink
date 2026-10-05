import type { ReactNode } from 'react';
import type { FieldProps } from './types';
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
    return <AstryxSelector {...props} changeAction={undefined} isLoading={false} />;
}
