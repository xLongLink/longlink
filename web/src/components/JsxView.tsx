import * as host from '@/views/host';
import { api, ApiError } from '@/lib/api';
import { useNavigate } from 'react-router';
import { PageError } from '@/components/Utils';
import { resolveNavigationUrl } from '@/lib/url';
import { Stack } from '@astryxdesign/core/Stack';
import { useEffect, useRef, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
    commandSchema,
    parametersSchema,
    MAX_SOURCE_SIZE,
    MAX_PENDING_REQUESTS,
    MAX_MESSAGE_SIZE,
    REQUEST_TIMEOUT,
    messageSize,
} from '@/views/protocol';

const BOOTSTRAP_TIMEOUT_MS = 10_000;

/** Renders Solution code only in a credential-free, opaque-origin sandbox. */
export function JsxView({
    source,
    params,
    requestBaseUrl,
    navigationBaseUrl,
}: {
    source: string;
    params: Record<string, string>;
    requestBaseUrl: string;
    navigationBaseUrl: string;
}) {
    const frame = useRef<HTMLIFrameElement>(null);
    const navigate = useNavigate();

    const [bootstrapState, setBootstrapState] = useState<
        { status: 'preparing' } | { status: 'prepared'; document: string } | { status: 'failed' }
    >({ status: 'preparing' });

    const parameters = JSON.stringify(params);

    const { data: kernel } = useSuspenseQuery({
        queryKey: ['view-runtime'],
        staleTime: Infinity,
        retry: false,
        queryFn: async ({ signal }) => {
            // Bound asset loading through body completion, not just response headers.
            const lifetime = AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT)]);

            return Promise.all([
                api('/views/runtime.js', { signal: lifetime, credentials: 'omit', timeout: false }).text(),
                api('/views/runtime.css', { signal: lifetime, credentials: 'omit', timeout: false }).text(),
            ]);
        },
    });

    useEffect(() => {
        const [script, styles] = kernel;
        const controller = new AbortController();
        const channel = new MessageChannel();
        const session = crypto.randomUUID();
        const pending = new Set<number>();
        let handshakeTimer: ReturnType<typeof setTimeout> | undefined;

        /** Revokes the attempt's capabilities and startup deadline on failure or unmount. */
        function dispose(): void {
            controller.abort();
            clearTimeout(handshakeTimer);
            window.removeEventListener('message', ready);
            channel.port1.close();
            channel.port2.close();
        }

        /** Reports startup failure only while this attempt still owns the mounted frame. */
        function fail(): void {
            if (controller.signal.aborted) return;
            dispose();
            setBootstrapState({ status: 'failed' });
        }

        /** Connects one trusted bootstrap instance; subsequent window messages have no capabilities. */
        function ready(event: MessageEvent<unknown>): void {
            if (controller.signal.aborted) return;

            if (event.source !== frame.current?.contentWindow || event.origin !== 'null') return;

            if (event.data !== session) return;
            window.removeEventListener('message', ready);

            // A failed capability transfer is a startup failure, not a connected runtime.
            try {
                frame.current?.contentWindow?.postMessage(
                    { session, source, params: parametersSchema.parse(JSON.parse(parameters)) },
                    '*',
                    [channel.port2]
                );
                clearTimeout(handshakeTimer);
            } catch {
                fail();
            }
        }

        // Authenticate the bootstrap by its WindowProxy and fresh session before transferring a private port.
        window.addEventListener('message', ready);
        channel.port1.onmessage = async (event: MessageEvent<unknown>) => {
            const parsed = commandSchema.safeParse(event.data);

            if (!parsed.success || controller.signal.aborted) return;
            const command = parsed.data;

            if (command.type === 'navigate') {
                try {
                    host.requestUrl(navigationBaseUrl, command.path);
                    const destination = resolveNavigationUrl(navigationBaseUrl, command.path);

                    if (destination) await navigate(destination);
                } catch {
                    // Invalid navigation does not acquire any host capability.
                }

                return;
            }

            if (pending.has(command.id)) return;

            if (pending.size >= MAX_PENDING_REQUESTS) {
                channel.port1.postMessage({
                    id: command.id,
                    ok: false,
                    error: 'Too many pending requests',
                    status: 429,
                });

                return;
            }

            pending.add(command.id);

            // The frame chooses a Solution-relative operation, never credentials, headers, or fetch options.
            try {
                if (command.type === 'request' && messageSize(command) > MAX_MESSAGE_SIZE) {
                    throw new ApiError('Solution request is too large', 413);
                }

                const data =
                    command.type === 'download'
                        ? await host.download(requestBaseUrl, command, controller.signal)
                        : await host.request(requestBaseUrl, command, controller.signal);

                if (!controller.signal.aborted) channel.port1.postMessage({ id: command.id, ok: true, data });
            } catch (error) {
                if (!controller.signal.aborted)
                    channel.port1.postMessage({ id: command.id, ok: false, ...host.requestError(error) });
            } finally {
                pending.delete(command.id);
            }
        };

        /** Builds a trusted boot document; Solution source is transferred as data, never interpolated into HTML. */
        async function bootstrap(): Promise<void> {
            if (source.length > MAX_SOURCE_SIZE) throw new Error('View source is too large');

            const code = `window.__VIEW_SESSION__=${JSON.stringify(session)};\n${script}`.replace(
                /<\/script/gi,
                '<\\/script'
            );

            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
            const hash = btoa(String.fromCharCode(...new Uint8Array(digest)));
            const policy = `default-src 'none'; script-src 'sha256-${hash}' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;

            if (!controller.signal.aborted) {
                // A blocked bootstrap script must surface an error instead of leaving a blank frame.
                handshakeTimer = setTimeout(fail, BOOTSTRAP_TIMEOUT_MS);
                const document = `<!doctype html><html class="h-full"><head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"><style>${styles.replace(/<\/style/gi, '<\\/style')}</style></head><body class="h-full overflow-hidden bg-transparent text-primary"><main id="view" class="h-full"></main><script>${code}</script></body></html>`;

                // Keep startup failure latched until the route owner mounts a fresh View.
                setBootstrapState((current) =>
                    current.status === 'failed' ? current : { status: 'prepared', document }
                );
            }
        }

        void bootstrap().catch(fail);

        // Replacing or unmounting a View revokes its channel and cancels every outstanding operation.
        return dispose;
    }, [source, parameters, requestBaseUrl, navigationBaseUrl, navigate, kernel]);

    if (bootstrapState.status === 'failed')
        return (
            <PageError title="Unable to load this View" description="The isolated View runtime could not be loaded." />
        );

    return (
        // The View owns one viewport and scroll region; overlays no longer depend on normal-flow content height.
        <Stack height="calc(100dvh - var(--_app-shell-header-height, 0px) - var(--spacing-8))" gap={0}>
            <iframe
                ref={frame}
                title="Solution View"
                // Allow native validation and submit events; CSP form-action blocks direct form navigation.
                sandbox="allow-scripts allow-forms"
                referrerPolicy="no-referrer"
                srcDoc={bootstrapState.status === 'prepared' ? bootstrapState.document : undefined}
                className="block h-full min-h-0 w-full flex-1 border-0 bg-transparent"
            />
        </Stack>
    );
}
