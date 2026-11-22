import { useState } from 'react';

/** Returns a close callback owned by this render's selection, not a later replacement. */
export function useSelection<T>() {
    const [selection, setSelection] = useState<T | null>(null);

    function closeSelection() {
        setSelection((current) => (current === selection ? null : current));
    }

    return [selection, setSelection, closeSelection] as const;
}
