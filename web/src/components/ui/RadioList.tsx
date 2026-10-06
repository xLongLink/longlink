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
    // Keep radio choices vertical, visible, and enabled by default.
    return (
        <AstryxRadioList
            {...props}
            children={props.children}
            orientation={props.orientation ?? 'vertical'}
            size={props.size ?? 'md'}
            isLabelHidden={props.isLabelHidden ?? false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
        />
    );
}

/** Defines one option using the surrounding RadioList's selection context. */
export function RadioListItem(props: {
    /** Visible label identifying this choice. */
    label: string;
    /** Value passed to the surrounding RadioList when selected. */
    value: string;
    /** Optional helper text explaining the choice. */
    description?: string;
    isDisabled?: boolean;
}) {
    // Individual options remain selectable unless disabled.
    return <AstryxRadioListItem {...props} isDisabled={props.isDisabled ?? false} />;
}
