import { useState } from 'react';
import { isValtioProxy } from './state';
import { resolveXmlValue } from './props';
import { proxy, useSnapshot } from 'valtio';
import type { ASTProps, Scope } from '../types';
import { isSafePropertyName, resolvePath } from '../expressions/resolve';

const EMPTY_BINDING = proxy<Record<string, unknown>>({});

type BindingTarget = {
    state: Record<string, unknown>;
    key?: string;
};

/** Resolves XML input binding state for controlled and uncontrolled form controls. */
export function useBindableValue<T>(props: ASTProps, name: string, ctx: Scope, coerce: (value: unknown) => T) {
    const value = resolveXmlValue(props, name, ctx);
    const target = resolveBindableTarget(props[name], value, ctx);
    const snapshot = useSnapshot(target?.state ?? EMPTY_BINDING);
    const currentValue = target?.key ? snapshot[target.key] : 'value' in snapshot ? snapshot.value : '';
    const [localValue, setLocalValue] = useState(() => coerce(value));

    return {
        value: target ? coerce(currentValue) : localValue,
        setValue: (nextValue: T) => {
            if (!target) {
                setLocalValue(nextValue);
                return;
            }

            // Write named properties or the direct binding value slot.
            if (target.key || 'value' in target.state) {
                target.state[target.key ?? 'value'] = nextValue;
            }
        },
    };
}

/** Resolves a writable state target from a raw XML binding expression. */
function resolveBindableTarget(
    attribute: ASTProps[string] | undefined,
    value: unknown,
    ctx: Scope
): BindingTarget | undefined {
    // Use resolved proxy values directly.
    if (isValtioProxy(value)) return { state: value };

    // Only reference expressions can be written.
    if (attribute?.kind !== 'path' || !attribute.isBinding) return undefined;

    const { parts } = attribute;

    // Restrict path segments to safe keys.
    if (!parts.every(isSafePropertyName)) {
        throw new Error('XML binding path must use safe property names');
    }

    // Resolve direct state references.
    if (parts.length === 1) {
        const state = resolvePath(ctx, parts);

        return isValtioProxy(state) ? { state } : undefined;
    }

    const parent = resolvePath(ctx, [parts[0], ...parts.slice(1, -1)]);

    // Nested bindings require a reactive parent.
    if (!isValtioProxy(parent)) return undefined;

    return {
        key: parts[parts.length - 1],
        state: parent,
    };
}
