import { useState } from 'react';
import { resolveXmlValue } from './props';
import type { ASTProps, Scope } from '../types';
import { getVersion, proxy, ref, useSnapshot } from 'valtio';
import { isSafePropertyName, resolvePath } from '../expressions';

const EMPTY_BINDING = proxy<Record<string, unknown>>({});

type BindingTarget = {
    state: Record<string, unknown>;
    key?: string;
};

/** Returns whether an XML control value is backed by a Valtio proxy. */
function isBindableValue(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && getVersion(value) !== undefined;
}

/** Resolves XML input binding state for controlled and uncontrolled form controls. */
export function useBindableValue<T>(
    props: ASTProps,
    name: string,
    ctx: Scope,
    coerce: (value: unknown) => T,
    type?: 'file'
) {
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
                target.state[target.key ?? 'value'] =
                    type === 'file' && nextValue !== null && typeof nextValue === 'object' ? ref(nextValue) : nextValue;
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
    if (isBindableValue(value)) return { state: value };

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

        return isBindableValue(state) ? { state } : undefined;
    }

    const parent = resolvePath(ctx, [parts[0], ...parts.slice(1, -1)]);

    // Nested bindings require a reactive parent.
    if (!isBindableValue(parent)) return undefined;

    return {
        key: parts[parts.length - 1],
        state: parent,
    };
}
