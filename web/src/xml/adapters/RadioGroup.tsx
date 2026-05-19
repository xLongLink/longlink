import { RadioGroup as UIRadioGroup, RadioGroupItem as UIRadioGroupItem } from '@/components/ui/radio-group';
import { getVersion, useSnapshot } from 'valtio';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

/** Props accepted by the XML RadioGroup component. */

/** Props accepted by the XML RadioGroupItem component. */

/** Renders a radio group shell with XML-rendered children. */
export function RadioGroup({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultValue = resolveXmlValue(props, 'defaultValue', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const form = resolveXmlString(props, 'form', ctx);
    const name = resolveXmlString(props, 'name', ctx);
    const readOnly = resolveXmlBoolean(props, 'readOnly', ctx);
    const required = resolveXmlBoolean(props, 'required', ctx);
    const value = resolveXmlValue(props, 'value', ctx);

    // Normalize literal values and reactive state slots into the Base UI value contract.
    const resolvedDefaultValue =
        defaultValue && typeof defaultValue === 'object' && getVersion(defaultValue) !== undefined
            ? (() => {
                  const state = defaultValue as Record<string, unknown> & { value?: unknown };
                  const snapshot = useSnapshot(state);
                  const currentValue = 'value' in snapshot ? snapshot.value : snapshot;

                  return currentValue != null ? String(currentValue) : undefined;
              })()
            : defaultValue != null
              ? String(defaultValue)
              : undefined;
    const resolvedValue =
        value && typeof value === 'object' && getVersion(value) !== undefined
            ? (() => {
                  const state = value as Record<string, unknown> & { value?: unknown };
                  const snapshot = useSnapshot(state);
                  const currentValue = 'value' in snapshot ? snapshot.value : snapshot;

                  return currentValue != null ? String(currentValue) : undefined;
              })()
            : value != null
              ? String(value)
              : undefined;

    return (
        <UIRadioGroup
            defaultValue={resolvedDefaultValue}
            disabled={disabled}
            form={form}
            name={name}
            readOnly={readOnly}
            required={required}
            value={resolvedValue}
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
    const value = resolveXmlString(props, 'value', ctx);

    if (!value) throw new Error('RadioGroupItem requires a value');

    return (
        <label className="inline-flex items-center gap-2">
            <UIRadioGroupItem disabled={disabled} readOnly={readOnly} required={required} value={value} />
            {renderNode(nodes, ctx)}
        </label>
    );
}
