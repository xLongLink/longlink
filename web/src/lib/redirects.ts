import { normalizeSameOriginPath } from '@/lib/urls';

/** Sanitizes login redirect targets to same-origin relative paths. */
export function sanitizeRedirectPath(value: string | null | undefined, fallback = '/organizations'): string {
    const candidate = value?.trim() ?? '';

    return normalizeSameOriginPath(candidate) ?? fallback;
}
