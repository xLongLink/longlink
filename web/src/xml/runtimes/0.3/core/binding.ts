import { useState } from 'react';
import { getVersion, proxy, ref, useSnapshot } from 'valtio';
import { isSafePropertyName, resolvePath } from '../expressions';
import type { ASTProps, Scope } from '../types';
import { resolveXmlValue } from './props';

const EMPTY_BINDING = proxy<Record<string, unknown>>({});

type BindingType = 'file';

type BindingTarget = {
    state: Record<string, unknown>;
    key?: string;
};

/** Returns whether an XML control value is backed by a Valtio proxy. */
function isBindableValue(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && getVersion(value) !== undefined;
}

/** Coerces an evaluated XML control value without treating the string "false" as true. */
export function toXmlBoolean(value: unknown): boolean {
    if (value === false || value === 'false' || value == null || value === '') return false;

    return Boolean(value);
}

/** Resolves XML input binding state for controlled and uncontrolled form controls. */
export function useBindableValue<T>(
    props: ASTProps,
    name: string,
    ctx: Scope,
    coerce: (value: unknown) => T,
    type?: BindingType,
    getInitialValue?: () => T
) {
    const rawValue = props[name];
    const value = resolveXmlValue(props, name, ctx);
    const target = resolveBindableTarget(rawValue, value, ctx);
    const snapshot = useSnapshot(target?.state ?? EMPTY_BINDING);
    const currentValue = target?.key ? snapshot[target.key] : 'value' in snapshot ? snapshot.value : '';
    const [localValue, setLocalValue] = useState(() => getInitialValue?.() ?? coerce(value));

    return {
        bound: !!target,
        value: target ? coerce(currentValue) : localValue,
        setValue: (nextValue: T) => {
            if (!target) {
                setLocalValue(nextValue);
                return;
            }

            // Write named properties or the direct binding value slot.
            if (target.key || 'value' in target.state) {
                target.state[target.key ?? 'value'] =
                    type === 'file' && nextValue !== null && typeof nextValue === 'object' ? ref(nextValue) : nextValue;
            }
        },
    };
}

/** Resolves a writable state target from a raw XML binding expression. */
function resolveBindableTarget(attribute: ASTProps[string] | undefined, value: unknown, ctx: Scope): BindingTarget | undefined {
    // Use resolved proxy values directly.
    if (isBindableValue(value)) return { state: value };

    // Only reference expressions can be written.
    if (attribute?.kind !== 'path' || !attribute.isBinding) return undefined;

    const { parts } = attribute;

    // Reject empty binding paths.
    if (parts.length === 0) return undefined;

    // Restrict path segments to safe keys.
    if (!parts.every(isSafePropertyName)) {
        throw new Error('XML binding path must use safe property names');
    }

    // Resolve direct state references.
    if (parts.length === 1) {
        const state = resolvePath(ctx, parts);

        return isBindableValue(state) ? { state } : undefined;
    }

    const parent = resolvePath(ctx, parts.slice(0, -1));

    // Nested bindings require a reactive parent.
    if (!isBindableValue(parent)) return undefined;

    return {
        key: parts[parts.length - 1],
        state: parent,
    };
}
