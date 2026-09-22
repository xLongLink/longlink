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
export function useBindableValue<T>(
    props: ASTProps,
    name: string,
    ctx: Scope,
    coerce: (value: unknown) => T,
    property?: string
) {
    const value = resolveXmlValue(props, name, ctx);
    const target = resolveBindableTarget(props[name], value, ctx, property);
    const reactiveValue = isReactiveValue(props[name], ctx);
    let currentValue: unknown = '';

    if (target?.key) {
        currentValue = target.state[target.key];
    } else if (target && 'value' in target.state) {
        currentValue = target.state.value;
    }

    const initialValue = value != null && typeof value === 'object' ? undefined : value;
    const [localValue, setLocalValue] = useState(() => coerce(initialValue));

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
                return;
            }

            // Direct object bindings receive the selected option fields.
            if (nextValue != null && typeof nextValue === 'object' && !Array.isArray(nextValue)) {
                Object.assign(target.state, nextValue);
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
    ctx: Scope,
    property?: string
): BindingTarget | undefined {
    if (property != null && !isSafePropertyName(property)) {
        throw new Error('XML binding property must be a safe identifier');
    }

    // Use resolved proxy values directly.
    if (isValtioProxy(value)) return { key: property, state: value };

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

    const parentParts: [string, ...string[]] = [parts[0], ...parts.slice(1, -1)];
    const parent = resolvePath(ctx, parentParts);

    // Nested bindings require a reactive parent.
    if (!isValtioProxy(parent)) return undefined;

    return {
        key: property ?? parts[parts.length - 1],
        state: parent,
    };
}
