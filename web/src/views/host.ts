import { api } from '@/lib/api';
import { resolveRequestUrl } from '@/xml/core/url';
import { MAX_MESSAGE_SIZE, REQUEST_TIMEOUT, type RequestCommand } from './protocol';

/** Resolves a capability URL without permitting redirects or proxy-prefix traversal. */
export function requestUrl(base: string, path: string): string {
    // Reject ambiguous encoding before any proxy or backend gets an opportunity to decode it again.
    if (/%(?:[01][0-9a-f]|7f|25|2e|2f|5c)|[\s\\]|\p{Cc}/iu.test(path.split(/[?#]/, 1)[0])) {
        throw new Error('Request path must remain within the Solution');
    }
    return resolveRequestUrl(base, path);
}

/** Reads untrusted response bodies with a decoded-byte limit and releases their streams. */
export async function read(response: Response, limit: number): Promise<Blob> {
    const reader = response.body?.getReader();
    if (!reader) return new Blob();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;

    // Bound decoded response bytes rather than trusting a missing or compressed Content-Length.
    try {
        while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > limit) throw new Error('Solution response is too large');
            chunks.push(chunk.value);
        }
    } finally {
        try {
            await reader.cancel();
        } finally {
            reader.releaseLock();
        }
    }
    return new Blob(chunks);
}

/** Executes one validated request using only host-owned credentials and fixed options. */
export async function request(base: string, command: RequestCommand, signal: AbortSignal): Promise<unknown> {
    const url = requestUrl(base, command.path);
    if (command.json !== undefined && command.form !== undefined) throw new Error('Choose JSON or form data');
    if (command.method === 'GET' && (command.json !== undefined || command.form !== undefined)) {
        throw new Error('GET requests cannot send a body');
    }
    const form = command.form === undefined ? undefined : new FormData();
    for (const [name, value] of command.form ?? []) form?.append(name, value);

    // Bound the complete response lifetime, including a server that stalls after sending headers.
    const lifetime = AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT)]);
    const response = await api(url, {
        method: command.method,
        json: command.json,
        body: form,
        signal: lifetime,
        redirect: 'error',
        timeout: REQUEST_TIMEOUT,
    });
    const body = await read(response, MAX_MESSAGE_SIZE);
    if (command.binary) {
        const media = response.headers.get('content-type')?.split(';', 1)[0] ?? '';
        const type = /^(?:image\/(?:png|jpeg|gif|webp)|audio\/(?:mpeg|ogg)|video\/mp4|application\/pdf)$/.test(media)
            ? media
            : 'application/octet-stream';
        return new Blob([body], { type });
    }
    const text = await body.text();
    const data: unknown = text ? JSON.parse(text) : null;
    return data;
}
