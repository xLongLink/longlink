import { normalizeSameOriginPath } from '@/lib/urls';

export const AUTH_RETURN_PATH_KEY = 'longlink.auth.returnPath';

/** Sanitizes login redirect targets to same-origin relative paths. */
export function sanitizeRedirectPath(value: string | null | undefined, fallback = '/organizations'): string {
    const candidate = value?.trim() ?? '';

    return normalizeSameOriginPath(candidate) ?? fallback;
}
