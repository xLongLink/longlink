import { ApiError } from '@/lib/api';
import { useErrorBoundary } from 'react-error-boundary';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

export type VerificationRequest = { signal: AbortSignal; token: string };

type Verification<T> = { status: 'verified'; data: T } | { status: 'error' };

/** Exchanges credentials while retaining canceled or unexpectedly failed proof for retry. */
export function useVerification<T>(
    token: string,
    storageKey: string,
    verify: (request: VerificationRequest) => Promise<T>
) {
    const controller = useRef<AbortController | null>(null);
    const [verification, setVerification] = useState<Verification<T> | null>(null);
    const { showBoundary } = useErrorBoundary();

    /** Replaces the active credential exchange with a cancellable request. */
    async function startVerification(verificationToken: string) {
        controller.current?.abort();
        const nextController = new AbortController();
        controller.current = nextController;
        setVerification(null);

        try {
            let outcome: Verification<T>;

            try {
                const data = await verify({ signal: nextController.signal, token: verificationToken });
                outcome = { status: 'verified', data };
            } catch (cause: unknown) {
                if (!(cause instanceof ApiError) || cause.status !== 400) throw cause;
                outcome = { status: 'error' };
            }

            if (nextController.signal.aborted) return;
            sessionStorage.removeItem(storageKey);
            setVerification(outcome);
        } catch (cause) {
            if (!nextController.signal.aborted) showBoundary(cause);
        }
    }

    const startInitialVerification = useEffectEvent(startVerification);

    // Exchange the current token and cancel work on cleanup.
    useEffect(() => {
        // oxlint-disable-next-line react/set-state-in-effect -- Starting a server credential exchange must clear the previous admission result.
        void startInitialVerification(token);

        return () => controller.current?.abort();
    }, [token]);

    return { verification, startVerification };
}
