import { useRef, useTransition } from 'react';

export function useConfirmAction() {
    const inFlight = useRef(false);
    const [isPending, startTransition] = useTransition();

    function run(action: () => void | Promise<void>) {
        if (inFlight.current) return;
        inFlight.current = true;
        startTransition(async () => {
            try {
                await action();
            } finally {
                inFlight.current = false;
            }
        });
    }

    return { isPending, inFlight, run };
}
