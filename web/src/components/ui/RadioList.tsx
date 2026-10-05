import type { ReactNode } from 'react';
import type { FieldProps } from './types';
import { RadioList as AstryxRadioList, RadioListItem as AstryxRadioListItem } from '@astryxdesign/core/RadioList';

/** Selects one of a small number of labeled values. */
export function RadioList(
    props: FieldProps & {
        children?: ReactNode;
        value: string;
        onChange: (value: string) => void;
        orientation?: 'vertical' | 'horizontal';
        htmlName?: string;
        size?: 'sm' | 'md';
    }
) {
    return <AstryxRadioList {...props} children={props.children} />;
}

/** Defines one option using the surrounding RadioList's selection context. */
export function RadioListItem(props: { label: string; value: string; description?: string; isDisabled?: boolean }) {
    return <AstryxRadioListItem {...props} />;
}
