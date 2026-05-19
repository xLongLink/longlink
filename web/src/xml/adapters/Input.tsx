import { Input as UIInput } from '@ui/input';
import { useXmlContext } from '../core/context';
import type { Props } from '../types';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

import { useBindableValue } from './binding';

/** Props accepted by the XML Input component. */

/** Renders a minimal XML input control. */
export function Input({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const ariaInvalid = resolveXmlBoolean(props, 'aria-invalid', ctx);
    const autoComplete = resolveXmlString(props, 'autoComplete', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const value = resolveXmlValue(props, 'value', ctx);
    const label = resolveXmlString(props, 'label', ctx);
    const placeholder = resolveXmlValue(props, 'placeholder', ctx);
    const type = resolveXmlString(props, 'type', ctx, 'text');
    const placeholderText = String(placeholder ?? label ?? '');
    const binding = useBindableValue(value, type);

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
