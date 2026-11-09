import type { Options } from 'ky';
import { api, ApiError } from '@/lib/api';
import { textLanguage } from '@/lib/files';
import { resolveRequestUrl } from '@/lib/url';
import { REQUEST_TIMEOUT, responseSchema, type ViewData, type RequestCommand, type DownloadCommand } from './protocol';

/** Resolves a capability URL without permitting redirects or proxy-prefix traversal. */
export function requestUrl(base: string, path: string): string {
    // Reject ambiguous encoding before any proxy or backend gets an opportunity to decode it again.
    if (/%(?:[01][0-9a-f]|7f|25|2e|2f|5c)|[\s\\]|\p{Cc}/iu.test(path.split(/[?#]/, 1)[0])) {
        throw new Error('Request path must remain within the Solution');
    }

    return resolveRequestUrl(base, path);
}

/** Loads a response without redirects within the request lifetime. */
export async function load(
    url: string,
    options: Pick<Options, 'headers' | 'method' | 'json' | 'body' | 'cache'> & { signal: AbortSignal }
): Promise<Blob> {
    // Bound the complete response lifetime, including a server that stalls after sending headers.
    const response = await api(url, {
        ...options,
        signal: AbortSignal.any([options.signal, AbortSignal.timeout(REQUEST_TIMEOUT)]),
        redirect: 'error',
        timeout: false,
    });

    // Preserve only supported media types before granting a binary response to the sandbox.
    const media = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() ?? '';

    const type =
        textLanguage('', media) ||
        /^(?:image\/(?:png|jpeg|gif|webp)|audio\/(?:mpeg|ogg)|video\/mp4|application\/pdf)$/.test(media)
            ? media
            : 'application/octet-stream';

    // Read the complete response within the request lifetime.
    const body = await response.blob();

    return body.slice(0, body.size, type);
}

/** Executes one validated request using only host-owned credentials and fixed options. */
export async function request(base: string, command: RequestCommand, signal: AbortSignal): Promise<ViewData> {
    const url = requestUrl(base, command.path);
    let form: FormData | undefined;

    // Preserve an explicit empty form while populating only supplied entries.
    if (command.form !== undefined) {
        form = new FormData();

        for (const [name, value] of command.form) form.append(name, value);
    }

    // Revalidate binary previews when files change without changing their URLs.
    const body = await load(url, {
        method: command.method,
        json: command.json,
        body: form,
        cache: command.binary ? 'no-cache' : undefined,
        signal,
    });

    if (command.binary) return body;
    const text = await body.text();

    // Validate the serialized response before sending it over the capability channel.
    return text ? responseSchema.parse(JSON.parse(text)) : null;
}

/** Downloads Solution bytes in the host without granting sandbox navigation or downloads. */
export async function download(base: string, command: DownloadCommand, signal: AbortSignal): Promise<null> {
    // Treat every download as inert attachment bytes, including HTML and SVG documents.
    const body = await load(requestUrl(base, command.path), { signal });
    signal.throwIfAborted();
    const url = URL.createObjectURL(new Blob([body], { type: 'application/octet-stream' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = command.filename;

    // Let the browser acquire the URL before releasing it, even if activation fails.
    try {
        document.body.append(link);
        link.click();
    } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    return null;
}

type RequestFailure = { error: string; status?: number };

/** Exposes bounded client-facing errors without transport URLs, stack traces, or server failures. */
export function requestError(cause: unknown): RequestFailure {
    // Backend client errors contain actionable validation and permission feedback.
    if (cause instanceof ApiError) {
        return {
            error:
                cause.status < 500
                    ? cause.message.slice(0, 1024)
                    : 'The server could not complete the request. Please try again.',
            status: cause.status,
        };
    }

    // Explain supported transport failures without echoing arbitrary network diagnostics.
    if (cause instanceof SyntaxError) return { error: 'The Solution returned an invalid JSON response.' };

    if (cause instanceof Error && cause.name === 'TimeoutError') return { error: 'Solution request timed out.' };

    return { error: 'Solution request failed. Please try again.' };
}
