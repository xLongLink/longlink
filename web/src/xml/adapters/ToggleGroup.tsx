import { ToggleGroup as UIToggleGroup, ToggleGroupItem as UIToggleGroupItem } from '@/components/ui/toggle-group';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { getVersion, useSnapshot } from 'valtio';
import { resolveXmlBoolean, resolveXmlNumber, resolveXmlString, resolveXmlValue } from './props';

/** Props accepted by the XML ToggleGroup component. */
export interface ToggleGroupProps extends Props {}

/** Props accepted by the XML ToggleGroupItem component. */
export interface ToggleGroupItemProps extends Props {}

/** Renders a toggle group shell with XML-rendered children. */
export function ToggleGroup({ props, nodes }: ToggleGroupProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const defaultValue = resolveXmlValue(props, 'defaultValue', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const loopFocus = resolveXmlBoolean(props, 'loopFocus', ctx);
    const orientation = resolveXmlString(props, 'orientation', ctx, 'horizontal');
    const size = resolveXmlString(props, 'size', ctx, 'default');
    const spacing = resolveXmlNumber(props, 'spacing', ctx, 0);
    const type = resolveXmlString(props, 'type', ctx, 'single');
    const value = resolveXmlValue(props, 'value', ctx);
    const variant = resolveXmlString(props, 'variant', ctx, 'default');

    // Normalize XML state bindings and literal values into the array contract used by Base UI.
    const resolvedDefaultValue = Array.isArray(defaultValue)
        ? defaultValue.map((entry) => String(entry))
        : defaultValue && typeof defaultValue === 'object' && getVersion(defaultValue) !== undefined
          ? (() => {
                const state = defaultValue as Record<string, unknown> & { value?: unknown };
                const snapshot = useSnapshot(state);
                const currentValue = 'value' in snapshot ? snapshot.value : snapshot;

                return Array.isArray(currentValue)
                    ? currentValue.map((entry) => String(entry))
                    : currentValue != null
                      ? [String(currentValue)]
                      : undefined;
            })()
          : defaultValue != null
            ? [String(defaultValue)]
            : undefined;
    const resolvedValue = Array.isArray(value)
        ? value.map((entry) => String(entry))
        : value && typeof value === 'object' && getVersion(value) !== undefined
          ? (() => {
                const state = value as Record<string, unknown> & { value?: unknown };
                const snapshot = useSnapshot(state);
                const currentValue = 'value' in snapshot ? snapshot.value : snapshot;

                return Array.isArray(currentValue)
                    ? currentValue.map((entry) => String(entry))
                    : currentValue != null
                      ? [String(currentValue)]
                      : undefined;
            })()
          : value != null
            ? [String(value)]
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
            {renderNode(children ?? [], ctx)}
        </UIToggleGroup>
    );
}

/** Renders a toggle group item with XML-rendered children. */
export function ToggleGroupItem({ props, nodes }: ToggleGroupItemProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const size = resolveXmlString(props, 'size', ctx, 'default');
    const value = resolveXmlString(props, 'value', ctx);
    const variant = resolveXmlString(props, 'variant', ctx, 'default');

    if (!value) throw new Error('ToggleGroupItem requires a value');

    return (
        <UIToggleGroupItem size={size} value={value} variant={variant}>
            {renderNode(children ?? [], ctx)}
        </UIToggleGroupItem>
    );
}
