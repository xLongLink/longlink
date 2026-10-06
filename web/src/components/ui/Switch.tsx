import { useValue } from './value';
import type { FieldProps } from './types';
import { Switch as AstryxSwitch } from '@astryxdesign/core/Switch';

/** Edits an on/off setting using one controlled change handler. */
export function Switch(
    props: FieldProps & {
        value?: boolean;
        checked?: boolean;
        defaultChecked?: boolean;
        onChange?: (value: boolean) => void;
        htmlName?: string;
        size?: 'sm' | 'md';
    }
) {
    // Use the themed switch's real checkbox rather than substituting an unstyled control.
    const { defaultChecked, checked, ...control } = props;
    const field = useValue<boolean, HTMLInputElement>(checked ?? props.value, defaultChecked ?? false, props.onChange);

    // Keep a visible, enabled switch without replacing its controlled value.
    return (
        <AstryxSwitch
            {...control}
            {...field}
            htmlName={props.name ?? props.htmlName}
            onChange={props.readOnly ? () => {} : field.onChange}
            size={props.size ?? 'md'}
            isLabelHidden={false}
            isRequired={props.required ?? props.isRequired ?? false}
            isDisabled={props.disabled ?? props.isDisabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}
