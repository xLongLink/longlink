import { useState } from 'react';
import { isValtioProxy } from './state';
import { resolveXmlValue } from './props';
import type { ASTProps, Scope } from '../types';
import { isSafePropertyName, resolvePath } from '../expressions/resolve';

type BindingTarget = {
    state: Record<string, unknown>;
    key?: string;
};

/** Coerces XML values using the runtime's boolean semantics. */
export function coerceXmlBoolean(value: unknown): boolean {
    return value !== 'false' && Boolean(value);
}

/** Resolves XML input binding state for controlled and uncontrolled form controls. */
export function useBindableValue<T>(props: ASTProps, name: string, ctx: Scope, coerce: (value: unknown) => T) {
    const value = resolveXmlValue(props, name, ctx);
    const target = resolveBindableTarget(props[name], value, ctx);
    const reactiveValue = isReactiveValue(props[name], ctx);
    let currentValue: unknown = '';

    if (target?.key) {
        currentValue = target.state[target.key];
    } else if (target && 'value' in target.state) {
        currentValue = target.state.value;
    }

    const [localValue, setLocalValue] = useState(() => coerce(value));

    return {
        value: target ? coerce(currentValue) : reactiveValue ? coerce(value) : localValue,
        setValue: (nextValue: T) => {
            if (!target) {
                setLocalValue(nextValue);
                return;
            }

            // Write named properties or the direct binding value.
            if (target.key || 'value' in target.state) {
                target.state[target.key ?? 'value'] = nextValue;
            }
        },
    };
}

/** Returns whether a read-only path resolves from reactive State. */
function isReactiveValue(attribute: ASTProps[string] | undefined, ctx: Scope): boolean {
    if (attribute?.kind !== 'path' || attribute.isBinding) return false;

    return isValtioProxy(resolvePath(ctx, [attribute.parts[0], ...attribute.parts.slice(1, -1)]));
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

    // Direct references were already resolved above and were not reactive.
    if (parts.length === 1) {
        return undefined;
    }

    const parent = resolvePath(ctx, [parts[0], ...parts.slice(1, -1)]);

    // Nested bindings require a reactive parent.
    if (!isValtioProxy(parent)) return undefined;

    return {
        key: parts[parts.length - 1],
        state: parent,
    };
}
