import { useValue } from './value';
import type { FieldProps } from './types';
import { CheckboxInput as AstryxCheckboxInput } from '@astryxdesign/core/CheckboxInput';

/** Edits a boolean or indeterminate field. */
export function CheckboxInput(
    props: FieldProps & {
        value?: boolean | 'indeterminate';
        defaultChecked?: boolean;
        onChange?: (value: boolean) => void;
        size?: 'sm' | 'md';
    }
) {
    // Astryx's underlying checkbox retains omission semantics and native validation.
    const { defaultChecked, ...control } = props;

    const field = useValue<boolean | 'indeterminate', HTMLInputElement>(props.value, defaultChecked ?? false, (value) =>
        props.onChange?.(value === true)
    );

    // Keep the field visible, enabled, and editable unless explicitly configured otherwise.
    return (
        <AstryxCheckboxInput
            {...control}
            {...field}
            htmlName={props.name}
            size={props.size ?? 'md'}
            isReadOnly={false}
            isLabelHidden={false}
            isRequired={props.required ?? false}
            isDisabled={props.disabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}
