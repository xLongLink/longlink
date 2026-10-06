import type { FieldProps } from './types';
import { Switch as AstryxSwitch } from '@astryxdesign/core/Switch';

/** Edits an on/off setting using one controlled change handler. */
export function Switch(
    props: FieldProps & { value: boolean; onChange?: (value: boolean) => void; htmlName?: string; size?: 'sm' | 'md' }
) {
    // Keep a visible, enabled switch without replacing its controlled value.
    return (
        <AstryxSwitch
            {...props}
            size={props.size ?? 'md'}
            isLabelHidden={props.isLabelHidden ?? false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}
