import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { RadioGroup as UIRadioGroup, RadioGroupItem as UIRadioGroupItem } from '@/components/ui/radio-group';
import { useBindableValue } from './binding';
import { requireXmlString, resolveXmlBoolean, resolveXmlString, resolveXmlValue, useXmlValueSnapshot } from './props';

/** Renders a radio group shell with XML-rendered children. */
export function RadioGroup({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultValue = resolveXmlValue(props, 'defaultValue', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const form = resolveXmlString(props, 'form', ctx);
    const name = resolveXmlString(props, 'name', ctx);
    const readOnly = resolveXmlBoolean(props, 'readOnly', ctx);
    const required = resolveXmlBoolean(props, 'required', ctx);
    const binding = useBindableValue(props, 'value', ctx);
    const { state: defaultValueState, snapshot: defaultValueSnapshot } = useXmlValueSnapshot(defaultValue);

    // Normalize literal values and reactive state slots into the Base UI value contract.
    const defaultCurrentValue = defaultValueState
        ? defaultValueSnapshot && typeof defaultValueSnapshot === 'object' && 'value' in defaultValueSnapshot
            ? defaultValueSnapshot.value
            : defaultValueSnapshot
        : defaultValue;
    const resolvedDefaultValue = defaultCurrentValue != null ? String(defaultCurrentValue) : undefined;
    const resolvedValue = binding.bound ? binding.currentValue || undefined : binding.initialValue || undefined;

    return (
        <UIRadioGroup
            defaultValue={resolvedDefaultValue}
            disabled={disabled}
            form={form}
            name={name}
            readOnly={readOnly}
            required={required}
            value={resolvedValue}
            onValueChange={
                binding.bound
                    ? (nextValue) => {
                          binding.setValue(nextValue ?? '');
                      }
                    : undefined
            }
        >
            {renderNode(nodes, ctx)}
        </UIRadioGroup>
    );
}

/** Renders a radio group item with XML-rendered children. */
export function RadioGroupItem({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const readOnly = resolveXmlBoolean(props, 'readOnly', ctx);
    const required = resolveXmlBoolean(props, 'required', ctx);
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);
    const value = requireXmlString(props, 'value', ctx, 'RadioGroupItem');

    return (
        <label className="inline-flex items-center gap-2">
            <UIRadioGroupItem disabled={disabled} readOnly={readOnly} required={required} value={value} />
            {text}
        </label>
    );
}
