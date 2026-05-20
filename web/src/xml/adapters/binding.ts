import { useState } from 'react';
import { getVersion, proxy, useSnapshot } from 'valtio';
import { isReference, resolvePath } from '../expressions';
import type { ASTProps, ExecutionContext, XmlBindableValue } from '../types';
import { resolveXmlValue } from './props';

const EMPTY_BINDING = proxy({ value: undefined });

type BindingResult = {
    bound: boolean;
    initialValue: string;
    currentValue: string;
    setValue: (value: string) => void;
};

type BindingTarget = {
    state: Record<string, unknown>;
    key?: string;
};

/** Returns whether an XML control value is backed by a Valtio proxy. */
export function isBindableValue(value: XmlBindableValue | undefined): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && getVersion(value) !== undefined;
}

/** Resolves XML input binding state for controlled and uncontrolled form controls. */
export function useBindableValue(props: ASTProps, name: string, ctx: ExecutionContext, type = 'text'): BindingResult {
    const rawValue = props[name];
    const value = resolveXmlValue(props, name, ctx);
    const [initialValue] = useState(String(value ?? ''));
    const target = resolveBindableTarget(rawValue, value, ctx);
    const state = target?.state ?? EMPTY_BINDING;
    const snapshot = useSnapshot(state);
    const currentValue = target?.key ? snapshot[target.key] : 'value' in snapshot ? snapshot.value : '';

    return {
        bound: !!target,
        initialValue,
        currentValue: String(currentValue ?? ''),
        setValue: (nextValue) => {
            if (!target) return;

            const normalizedValue = type === 'number' ? Number(nextValue) : nextValue;

            if (target.key) {
                target.state[target.key] = normalizedValue;
                return;
            }

            if ('value' in target.state) {
                target.state.value = normalizedValue;
            }
        },
    };
}

/** Resolves a writable state target from a raw XML binding expression. */
function resolveBindableTarget(
    rawValue: string | undefined,
    value: XmlBindableValue | undefined,
    ctx: ExecutionContext
): BindingTarget | undefined {
    if (isBindableValue(value)) return { state: value };

    if (!rawValue || !isReference(rawValue)) return undefined;

    const parts = rawValue.trim().slice(1).split('.').filter(Boolean);

    if (parts.length === 0) return undefined;

    if (parts.length === 1) {
        const state = resolvePath(ctx, parts);

        return isBindableValue(state) ? { state } : undefined;
    }

    const parent = resolvePath(ctx, parts.slice(0, -1));

    if (!parent || typeof parent !== 'object' || getVersion(parent) === undefined) return undefined;

    return {
        key: parts[parts.length - 1],
        state: parent as Record<string, unknown>,
    };
}
