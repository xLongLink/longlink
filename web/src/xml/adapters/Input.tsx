import type { Props } from '@/xml/types';
import { useXmlContext } from '@/xml/core/context';
import { Input as UIInput } from '@/components/ui/input';
import { readBindableFileInputValue, useBindableValue } from './binding';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

/** Renders a minimal XML input control. */
export function Input({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const accept = resolveXmlString(props, 'accept', ctx);
    const ariaInvalid = resolveXmlBoolean(props, 'aria-invalid', ctx);
    const autoComplete = resolveXmlString(props, 'autoComplete', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const label = resolveXmlString(props, 'label', ctx);
    const multiple = resolveXmlBoolean(props, 'multiple', ctx, false);
    const placeholder = resolveXmlValue(props, 'placeholder', ctx);
    const type = resolveXmlString(props, 'type', ctx, 'text');
    const placeholderText = String(placeholder ?? label ?? '');
    const binding = useBindableValue(props, 'value', ctx, type);

    // Use file input handling for file controls.
    if (type === 'file') {
        return (
            <UIInput
                accept={accept}
                aria-invalid={ariaInvalid}
                autoComplete={autoComplete}
                disabled={disabled}
                id={id}
                type={type}
                multiple={multiple}
                onChange={
                    binding.bound
                        ? (event) => {
                              binding.setValue(readBindableFileInputValue(event.currentTarget, multiple));
                          }
                        : undefined
                }
            />
        );
    }

    // Render bound inputs as controlled fields.
    if (binding.bound) {
        return (
            <UIInput
                aria-invalid={ariaInvalid}
                autoComplete={autoComplete}
                disabled={disabled}
                id={id}
                type={type}
                placeholder={placeholderText}
                value={binding.currentValue}
                onChange={(event) => {
                    binding.setValue(event.target.value);
                }}
            />
        );
    }

    return (
        <UIInput
            aria-invalid={ariaInvalid}
            autoComplete={autoComplete}
            disabled={disabled}
            id={id}
            type={type}
            placeholder={placeholderText}
            defaultValue={binding.initialValue}
        />
    );
}
