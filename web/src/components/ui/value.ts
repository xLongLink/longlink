import { useEffect, useRef, useState } from 'react';

/** Adapts controls that require a value to optional local state with native form reset behavior. */
export function useValue<T, Element extends HTMLElement = HTMLDivElement>(
    value: T | undefined,
    defaultValue: T,
    onChange?: (value: T) => void
) {
    // Keep local state only when the caller does not own the value.
    const [local, setLocal] = useState(defaultValue);
    const ref = useRef<Element>(null);

    // Synchronize with the real form's reset event, respecting canceled resets.
    useEffect(() => {
        const form = ref.current?.closest('form');
        if (!form || value !== undefined) return;
        const reset = (event: Event) => {
            queueMicrotask(() => {
                if (!event.defaultPrevented) setLocal(defaultValue);
            });
        };
        form.addEventListener('reset', reset);
        return () => form.removeEventListener('reset', reset);
    }, [value, defaultValue]);

    // Controlled callers receive changes without acquiring duplicate state.
    const change = (next: T) => {
        if (value === undefined) setLocal(next);
        onChange?.(next);
    };
    return { ref, value: value === undefined ? local : value, onChange: change };
}
