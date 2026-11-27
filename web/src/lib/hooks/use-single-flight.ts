import { useCallback, useRef } from 'react';

/** Shares the active promise until the admitted operation has fully settled. */
export function useSingleFlight<Args extends unknown[]>(
    action: (...args: Args) => Promise<void>
): (...args: Args) => Promise<void> {
    const pending = useRef<Promise<void> | null>(null);

    return useCallback(
        (...args: Args) => {
            if (pending.current) return pending.current;

            const operation = Promise.resolve().then(async () => {
                try {
                    await action(...args);
                } finally {
                    pending.current = null;
                }
            });
            pending.current = operation;
            return operation;
        },
        [action]
    );
}
