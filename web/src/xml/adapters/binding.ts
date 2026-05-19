import { useState } from 'react';
import { getVersion, proxy, useSnapshot } from 'valtio';
import type { XmlBindableValue } from '../types';

const EMPTY_BINDING = proxy({ value: undefined });

type BindingResult = {
    bound: boolean;
    initialValue: string;
    currentValue: string;
    setValue: (value: string) => void;
};

/** Returns whether an XML control value is backed by a Valtio proxy. */
export function isBindableValue(value: XmlBindableValue | undefined): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && getVersion(value) !== undefined;
}

/** Resolves XML input binding state for controlled and uncontrolled form controls. */
export function useBindableValue(value: XmlBindableValue | undefined, type = 'text'): BindingResult {
    const [initialValue] = useState(String(value ?? ''));
    const state = isBindableValue(value) ? value : EMPTY_BINDING;
    const snapshot = useSnapshot(state);
    const currentValue = 'value' in snapshot ? snapshot.value : snapshot;

    return {
        bound: isBindableValue(value),
        initialValue,
        currentValue: String(currentValue ?? ''),
        setValue: (nextValue) => {
            if (!isBindableValue(value) || !('value' in value)) return;

            value.value = type === 'number' ? Number(nextValue) : nextValue;
        },
    };
}
