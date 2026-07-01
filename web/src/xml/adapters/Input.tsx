import { Input as UIInput } from '@ui/input';
import { useXmlContext } from '@xml/core/context';
import type { Props } from '@xml/types';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

import { useBindableValue } from './binding';

/** Props accepted by the XML Input component. */

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
                              binding.setValue(readFileInputValue(event.currentTarget, multiple));
                          }
                        : undefined
                }
            />
        );
    }

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


/** Returns the selected file value that should be stored for one XML input. */
function readFileInputValue(input: HTMLInputElement, multiple: boolean): File | File[] | null {
    const files = input.files ? Array.from(input.files) : [];

    return multiple ? files : (files[0] ?? null);
}
