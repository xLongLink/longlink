import { useRef, useTransition } from 'react';

export function useConfirmAction() {
    const inFlight = useRef(false);
    const [isPending, startTransition] = useTransition();

    function run(action: () => void | Promise<void>) {
        if (inFlight.current) return;
        inFlight.current = true;
        let result: void | Promise<void>;

        try {
            result = action();
        } catch (error) {
            result = Promise.reject(error);
        }

        startTransition(async () => {
            try {
                await result;
            } finally {
                inFlight.current = false;
            }
        });
    }

    return { isPending, inFlight, run };
}
