import { useValue } from './value';
import type { FieldProps } from './types';
import { Switch as AstryxSwitch } from '@astryxdesign/core/Switch';

/** Edits an on/off setting using one controlled change handler. */
export function Switch(
    props: FieldProps & {
        value?: boolean;
        defaultChecked?: boolean;
        onChange?: (value: boolean) => void;
        size?: 'sm' | 'md';
    }
) {
    // Use the themed switch's real checkbox rather than substituting an unstyled control.
    const { defaultChecked, ...control } = props;
    const field = useValue<boolean, HTMLInputElement>(props.value, defaultChecked ?? false, props.onChange);

    // Keep a visible, enabled switch without replacing its controlled value.
    return (
        <AstryxSwitch
            {...control}
            {...field}
            className={props.hidden ? 'hidden!' : undefined}
            htmlName={props.name}
            size={props.size ?? 'md'}
            isLabelHidden={false}
            isRequired={props.required ?? false}
            isDisabled={props.disabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}
