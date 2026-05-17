import { RadioGroup as UIRadioGroup, RadioGroupItem as UIRadioGroupItem } from '@/components/ui/radio-group';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { getVersion, useSnapshot } from 'valtio';

/** Props accepted by the XML RadioGroup component. */
export interface RadioGroupProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    defaultValue?: string | Record<string, unknown>;
    disabled?: boolean;
    form?: string;
    name?: string;
    readOnly?: boolean;
    required?: boolean;
    value?: string | Record<string, unknown>;
}

/** Props accepted by the XML RadioGroupItem component. */
export interface RadioGroupItemProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    value?: string;
}

/** Renders a radio group shell with XML-rendered children. */
export function RadioGroup({
    children,
    className,
    defaultValue,
    disabled,
    form,
    name,
    readOnly,
    required,
    value,
}: RadioGroupProps) {
    const { ctx } = useXmlContext();

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
            className={className}
            defaultValue={resolvedDefaultValue}
            disabled={disabled}
            form={form}
            name={name}
            readOnly={readOnly}
            required={required}
            value={resolvedValue}
        >
            {renderNode(children ?? null, ctx)}
        </UIRadioGroup>
    );
}

/** Renders a radio group item with XML-rendered children. */
export function RadioGroupItem({ children, className, disabled, readOnly, required, value }: RadioGroupItemProps) {
    const { ctx } = useXmlContext();

    if (!value) throw new Error('RadioGroupItem requires a value');

    return (
        <UIRadioGroupItem className={className} disabled={disabled} readOnly={readOnly} required={required} value={value}>
            {renderNode(children ?? null, ctx)}
        </UIRadioGroupItem>
    );
}
