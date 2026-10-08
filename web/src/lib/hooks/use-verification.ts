import { useErrorBoundary } from 'react-error-boundary';
import { useEffect, useEffectEvent, useRef } from 'react';

export type VerificationRequest = {
    signal: AbortSignal;
    token: string;
};

/** Owns credential-exchange replacement and cancellation without choosing the page's token policy. */
export function useVerification(token: string, verify: (request: VerificationRequest) => Promise<void>) {
    const controller = useRef<AbortController | null>(null);
    const { showBoundary } = useErrorBoundary();

    /** Replaces the active credential exchange with a cancellable request. */
    function startVerification(verificationToken: string) {
        // Abort the previous attempt before publishing the replacement signal.
        controller.current?.abort();
        const nextController = new AbortController();
        controller.current = nextController;

        // Credential-specific outcomes stay in the page; unexpected active failures reach its boundary.
        void verify({ signal: nextController.signal, token: verificationToken }).catch((cause: unknown) => {
            if (controller.current === nextController) showBoundary(cause);
        });
    }

    const startInitialVerification = useEffectEvent(startVerification);

    // Exchange the current token and fence callbacks before canceling work on cleanup.
    useEffect(() => {
        startInitialVerification(token);

        return () => {
            const currentController = controller.current;
            controller.current = null;
            currentController?.abort();
        };
    }, [token]);

    return { startVerification };
}
