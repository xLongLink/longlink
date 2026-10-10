import { useErrorBoundary } from 'react-error-boundary';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

export type VerificationRequest = {
    signal: AbortSignal;
    token: string;
};

/** Owns credential-exchange state and cancellation without choosing the page's token policy. */
export function useVerification<T>(token: string, verify: (request: VerificationRequest) => Promise<T | undefined>) {
    const controller = useRef<AbortController | null>(null);
    const [verification, setVerification] = useState<T | null>(null);
    const { showBoundary } = useErrorBoundary();

    /** Replaces the active credential exchange with a cancellable request. */
    async function startVerification(verificationToken: string) {
        // Abort the previous attempt before publishing the replacement signal.
        controller.current?.abort();
        const nextController = new AbortController();
        controller.current = nextController;
        setVerification(null);

        // Only the active attempt can publish its outcome or an unexpected failure.
        try {
            const outcome = await verify({ signal: nextController.signal, token: verificationToken });

            if (controller.current === nextController && outcome !== undefined) setVerification(outcome);
        } catch (cause) {
            if (controller.current === nextController) showBoundary(cause);
        }
    }

    const startInitialVerification = useEffectEvent(startVerification);

    // Exchange the current token and fence callbacks before canceling work on cleanup.
    useEffect(() => {
        // oxlint-disable-next-line react/set-state-in-effect -- Starting a server credential exchange must clear the previous admission result.
        void startInitialVerification(token);

        return () => {
            const currentController = controller.current;
            controller.current = null;
            currentController?.abort();
        };
    }, [token]);

    return { verification, startVerification };
}
