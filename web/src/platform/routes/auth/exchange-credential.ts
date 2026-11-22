import { ApiError } from '@/lib/api';

/** Clears active accepted or invalid credentials without consuming canceled or unexpected failures. */
export async function exchangeCredential<T extends { status: 'verified' }>(
    request: () => Promise<T>,
    signal: AbortSignal,
    storageKey: string
): Promise<T | { status: 'error' } | undefined> {
    if (signal.aborted) return;

    let outcome: T | { status: 'error' };

    try {
        outcome = await request();
    } catch (cause: unknown) {
        if (signal.aborted) return;
        if (!(cause instanceof ApiError) || cause.status !== 400) throw cause;

        outcome = { status: 'error' };
    }

    if (signal.aborted) return;
    sessionStorage.removeItem(storageKey);

    return outcome;
}
