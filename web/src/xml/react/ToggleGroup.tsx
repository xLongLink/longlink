import { ToggleGroup as UIToggleGroup, ToggleGroupItem as UIToggleGroupItem } from '@/components/ui/toggle-group';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { getVersion, useSnapshot } from 'valtio';

/** Props accepted by the XML ToggleGroup component. */
export interface ToggleGroupProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    defaultValue?: string | string[] | Record<string, unknown>;
    disabled?: boolean;
    loopFocus?: boolean;
    orientation?: 'horizontal' | 'vertical';
    size?: 'sm' | 'default' | 'lg';
    spacing?: number;
    type?: 'single' | 'multiple';
    value?: string | string[] | Record<string, unknown>;
    variant?: 'default' | 'outline';
}

/** Props accepted by the XML ToggleGroupItem component. */
export interface ToggleGroupItemProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    size?: 'sm' | 'default' | 'lg';
    value?: string;
    variant?: 'default' | 'outline';
}

/** Renders a toggle group shell with XML-rendered children. */
export function ToggleGroup({
    children,
    className,
    defaultValue,
    disabled,
    loopFocus,
    orientation = 'horizontal',
    size = 'default',
    spacing = 0,
    type = 'single',
    value,
    variant = 'default',
}: ToggleGroupProps) {
    const { ctx } = useXmlContext();

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
            className={className}
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
            {renderNode(children ?? null, ctx)}
        </UIToggleGroup>
    );
}

/** Renders a toggle group item with XML-rendered children. */
export function ToggleGroupItem({
    children,
    className,
    size = 'default',
    value,
    variant = 'default',
}: ToggleGroupItemProps) {
    const { ctx } = useXmlContext();

    if (!value) throw new Error('ToggleGroupItem requires a value');

    return (
        <UIToggleGroupItem className={className} size={size} value={value} variant={variant}>
            {renderNode(children ?? null, ctx)}
        </UIToggleGroupItem>
    );
}
