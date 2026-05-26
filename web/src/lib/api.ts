const DEFAULT_API_URL = '';
export type { ApiResponse } from '@/lib/types';

/** Resolves an API path against the configured API origin. */
export function apiUrl(path: string): string {
    const baseUrl = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

    if (!baseUrl) {
        return path;
    }

    return new URL(path, baseUrl).toString();
}
