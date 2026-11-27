import { ApiError } from '@/lib/api';
import { useLocation } from 'react-router';
import { useErrorBoundary } from 'react-error-boundary';
import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';

export type VerificationRequest = { signal: AbortSignal; token: string };

/** Captures emailed credentials and owns their exchange, consumption, and cancellation. */
export function useVerification<T>(storageKey: string, verify: (request: VerificationRequest) => Promise<T>) {
    const location = useLocation();
    const fragmentToken = new URLSearchParams(location.hash.slice(1)).get('token');
    const token = useMemo(() => fragmentToken || sessionStorage.getItem(storageKey) || '', [fragmentToken, storageKey]);
    const controller = useRef<AbortController | null>(null);
    const [verification, setVerification] = useState<{ status: 'verified'; data: T } | { status: 'error' } | null>(
        null
    );
    const { showBoundary } = useErrorBoundary();

    useLayoutEffect(() => {
        if (fragmentToken) {
            sessionStorage.setItem(storageKey, fragmentToken);
            window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}`);
        }
    }, [fragmentToken, location.pathname, location.search, storageKey]);

    /** Replaces the active credential exchange with a cancellable request. */
    async function startVerification(verificationToken: string) {
        // Abort the previous attempt before publishing the replacement signal.
        controller.current?.abort();
        const nextController = new AbortController();
        controller.current = nextController;
        setVerification(null);

        try {
            let outcome: { status: 'verified'; data: T } | { status: 'error' };
            try {
                const data = await verify({ signal: nextController.signal, token: verificationToken });
                outcome = { status: 'verified', data };
            } catch (cause) {
                if (nextController.signal.aborted) return;
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
