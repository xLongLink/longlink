import { useEffect, useRef, useState } from 'react';

/**
 * Adapts controls to optional local state with native form reset behavior.
 * Pass controlled explicitly when undefined is a valid caller-owned empty value.
 */
export function useValue<T, Element extends HTMLElement = HTMLDivElement>(
    value: T | undefined,
    defaultValue: T,
    onChange?: (value: T) => void,
    controlled = value !== undefined
) {
    // Keep local state only when the caller does not own the value.
    const [local, setLocal] = useState(defaultValue);
    const ref = useRef<Element>(null);

    // Synchronize with the real form's reset event, respecting canceled resets.
    useEffect(() => {
        const form = ref.current?.closest('form');

        if (!form || controlled) return;

        const reset = (event: Event) => {
            queueMicrotask(() => {
                if (!event.defaultPrevented) setLocal(defaultValue);
            });
        };

        form.addEventListener('reset', reset);

        return () => form.removeEventListener('reset', reset);
    }, [controlled, defaultValue]);

    // Controlled callers receive changes without acquiring duplicate state.
    const change = (next: T) => {
        if (!controlled) setLocal(next);
        onChange?.(next);
    };

    // SAFETY: Controlled callers supply a value, or explicitly include undefined in T for an empty value.
    return { ref, value: controlled ? (value as T) : local, onChange: change };
}
