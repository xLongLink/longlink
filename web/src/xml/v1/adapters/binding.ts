import { useState } from 'react';
import { getVersion, proxy, ref, useSnapshot } from 'valtio';
import { isReference, isSafePropertyName, resolvePath } from '../expressions';
import type { ASTProps, ExecutionContext } from '../types';
import { resolveXmlValue } from './props';

const EMPTY_BINDING = proxy({ value: undefined }) as Record<string, unknown>;

type BindingTarget = {
    state: Record<string, unknown>;
    key?: string;
};

/** Returns whether an XML control value is backed by a Valtio proxy. */
export function isBindableValue(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && getVersion(value) !== undefined;
}

/** Coerces an evaluated XML control value without treating the string "false" as true. */
export function toXmlBoolean(value: unknown): boolean {
    if (value === false || value === 'false' || value == null || value === '') return false;

    return Boolean(value);
}

/** Resolves XML input binding state for controlled and uncontrolled form controls. */
export function useBindableValue(props: ASTProps, name: string, ctx: ExecutionContext, type = 'text') {
    const rawValue = props[name];
    const value = resolveXmlValue(props, name, ctx);
    const [initialValue] = useState(value);
    const target = resolveBindableTarget(rawValue, value, ctx);
    const snapshot = useSnapshot(target?.state ?? EMPTY_BINDING);

    return {
        bound: !!target,
        initialValue,
        currentValue: target?.key ? snapshot[target.key] : 'value' in snapshot ? snapshot.value : '',
        setValue: (nextValue: unknown) => {
            // Skip writes when the value is not bound.
            if (!target) return;

            const normalizedValue = normalizeBindableValue(type, nextValue);

            // Write named state properties directly.
            if (target.key) {
                target.state[target.key] = normalizedValue;
                return;
            }

            // Fall back to the default value slot.
            if ('value' in target.state) {
                target.state.value = normalizedValue;
            }
        },
    };
}

/** Normalizes control values before writing them into XML state. */
function normalizeBindableValue(type: string, value: unknown): unknown {
    // Store number inputs as numbers.
    if (type === 'number') return Number(value);

    // Keep file objects outside proxy conversion.
    if (type === 'file' && value !== null && typeof value === 'object') {
        return ref(value);
    }

    return value;
}

/** Resolves a writable state target from a raw XML binding expression. */
function resolveBindableTarget(
    rawValue: string | undefined,
    value: unknown,
    ctx: ExecutionContext
): BindingTarget | undefined {
    // Use resolved proxy values directly.
    if (isBindableValue(value)) return { state: value };

    // Only reference expressions can be written.
    if (!rawValue || !isReference(rawValue)) return undefined;

    const parts = rawValue.trim().slice(1).split('.').filter(Boolean);

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
    if (!parent || typeof parent !== 'object' || getVersion(parent as object) === undefined) return undefined;

    return {
        key: parts[parts.length - 1],
        state: parent as Record<string, unknown>,
    };
}
