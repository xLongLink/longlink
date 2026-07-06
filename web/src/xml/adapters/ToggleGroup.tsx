import { ToggleGroup as UIToggleGroup, ToggleGroupItem as UIToggleGroupItem } from '@/components/ui/toggle-group';
import { useXmlContext } from '@/xml/core/context';
import { renderNode } from '@/xml/core/node';
import type { Props } from '@/xml/types';
import {
    requireXmlString,
    resolveXmlBoolean,
    resolveXmlNumber,
    resolveXmlString,
    resolveXmlValue,
    useXmlValueSnapshot,
} from './props';

/** Props accepted by the XML ToggleGroup component. */

/** Props accepted by the XML ToggleGroupItem component. */

/** Renders a toggle group shell with XML-rendered children. */
export function ToggleGroup({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultValue = resolveXmlValue(props, 'defaultValue', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const loopFocus = resolveXmlBoolean(props, 'loopFocus', ctx);
    const orientation = resolveXmlString(props, 'orientation', ctx, 'horizontal');
    const size = resolveXmlString(props, 'size', ctx, 'default');
    const spacing = resolveXmlNumber(props, 'spacing', ctx, 0);
    const type = resolveXmlString(props, 'type', ctx, 'single');
    const value = resolveXmlValue(props, 'value', ctx);
    const variant = resolveXmlString(props, 'variant', ctx, 'default');
    const { state: defaultValueState, snapshot: defaultValueSnapshot } = useXmlValueSnapshot(defaultValue);
    const { state: valueState, snapshot: valueSnapshot } = useXmlValueSnapshot(value);
    const defaultCurrentValue = defaultValueState
        ? defaultValueSnapshot && typeof defaultValueSnapshot === 'object' && 'value' in defaultValueSnapshot
            ? defaultValueSnapshot.value
            : defaultValueSnapshot
        : defaultValue;
    const currentValue = valueState
        ? valueSnapshot && typeof valueSnapshot === 'object' && 'value' in valueSnapshot
            ? valueSnapshot.value
            : valueSnapshot
        : value;

    // Normalize XML state bindings and literal values into the array contract used by Base UI.
    const resolvedDefaultValue = Array.isArray(defaultCurrentValue)
        ? defaultCurrentValue.map((entry) => String(entry))
        : defaultCurrentValue != null
          ? [String(defaultCurrentValue)]
          : undefined;
    const resolvedValue = Array.isArray(currentValue)
        ? currentValue.map((entry) => String(entry))
        : currentValue != null
          ? [String(currentValue)]
          : undefined;
    const isMultiple = type === 'multiple';

    return (
        <UIToggleGroup
            defaultValue={resolvedDefaultValue}
            disabled={disabled}
            loopFocus={loopFocus}
            multiple={isMultiple}
            orientation={orientation}
            size={size}
            spacing={spacing}
            value={resolvedValue}
            variant={variant}
        >
            {renderNode(nodes, ctx)}
        </UIToggleGroup>
    );
}

/** Renders a toggle group item with XML-rendered children. */
export function ToggleGroupItem({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const size = resolveXmlString(props, 'size', ctx, 'default');
    const value = requireXmlString(props, 'value', ctx, 'ToggleGroupItem');
    const variant = resolveXmlString(props, 'variant', ctx, 'default');

    return (
        <UIToggleGroupItem size={size} value={value} variant={variant}>
            {renderNode(nodes, ctx)}
        </UIToggleGroupItem>
    );
}
