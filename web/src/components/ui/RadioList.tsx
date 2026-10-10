import { useValue } from './value';
import type { ReactNode } from 'react';
import type { FieldProps } from './types';
import { RadioList as AstryxRadioList, RadioListItem as AstryxRadioListItem } from '@astryxdesign/core/RadioList';

/** Selects one of a small number of labeled values. */
export function RadioList(
    props: FieldProps & {
        children?: ReactNode;
        value?: string;
        defaultValue?: string;
        onChange?: (value: string) => void;
        orientation?: 'vertical' | 'horizontal';
        size?: 'sm' | 'md';
    }
) {
    // The library's native radio inputs already provide grouping and required-field validation.
    const field = useValue(
        'value' in props ? (props.value ?? '') : undefined,
        props.defaultValue ?? '',
        props.onChange
    );

    // Keep radio choices vertical, visible, and enabled by default.
    return (
        <AstryxRadioList
            {...props}
            {...field}
            className={props.hidden ? 'hidden!' : undefined}
            htmlName={props.name}
            children={props.children}
            orientation={props.orientation ?? 'vertical'}
            size={props.size ?? 'md'}
            isLabelHidden={false}
            isRequired={props.required ?? false}
            isDisabled={props.disabled ?? false}
        />
    );
}

/** Defines one option using the surrounding RadioList's selection context. */
export function RadioListItem(props: {
    /** Hides the option without unmounting or disabling it. */
    hidden?: boolean;
    /** Visible label identifying this choice. */
    label: string;
    /** Value passed to the surrounding RadioList when selected. */
    value: string;
    /** Optional helper text explaining the choice. */
    description?: string;
    isDisabled?: boolean;
}) {
    // Individual options remain selectable unless disabled.
    return (
        <AstryxRadioListItem
            {...props}
            className={props.hidden ? 'hidden!' : undefined}
            isDisabled={props.isDisabled ?? false}
        />
    );
}
