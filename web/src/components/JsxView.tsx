import { api } from '@/lib/api';
import * as host from '@/views/host';
import { useNavigate } from 'react-router';
import { PageError } from '@/components/Utils';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { resolveNavigationUrl } from '@/xml/core/url';
import {
    commandSchema,
    parametersSchema,
    MAX_SOURCE_SIZE,
    MAX_PENDING_REQUESTS,
    MAX_MESSAGE_SIZE,
    messageSize,
} from '@/views/protocol';

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
    const [document, setDocument] = useState<string>();
    const [error, setError] = useState<string>();
    const [height, setHeight] = useState(1);
    const parameters = JSON.stringify(params);
    const { data: kernel, error: kernelError } = useQuery({
        queryKey: ['view-runtime'],
        staleTime: Infinity,
        retry: false,
        queryFn: async ({ signal }) =>
            Promise.all([
                api('/views/runtime.js', { signal, credentials: 'omit' }).text(),
                api('/views/runtime.css', { signal, credentials: 'omit' }).text(),
            ]),
    });

    useEffect(() => {
        if (!kernel) return;
        const [script, styles] = kernel;
        const controller = new AbortController();
        const channel = new MessageChannel();
        const session = crypto.randomUUID();
        const pending = new Set<number>();
        let initialized = false;

        /** Connects one trusted bootstrap instance; subsequent window messages have no capabilities. */
        function ready(event: MessageEvent<unknown>): void {
            if (initialized || event.source !== frame.current?.contentWindow || event.origin !== 'null') return;
            if (event.data !== session) return;
            initialized = true;
            frame.current?.contentWindow?.postMessage(
                { session, source, params: parametersSchema.parse(JSON.parse(parameters)) },
                '*',
                [channel.port2]
            );
        }

        // Authenticate the bootstrap by its WindowProxy and fresh session before transferring a private port.
        window.addEventListener('message', ready);
        channel.port1.onmessage = async (event: MessageEvent<unknown>) => {
            const parsed = commandSchema.safeParse(event.data);
            if (!parsed.success || controller.signal.aborted) return;
            const command = parsed.data;
            // Accept only bounded content dimensions over the existing private channel.
            if (command.type === 'resize') {
                setHeight(command.height);
                return;
            }
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
                channel.port1.postMessage({ id: command.id, ok: false, error: 'Too many pending requests' });
                return;
            }
            pending.add(command.id);

            // The frame chooses a Solution-relative operation, never credentials, headers, or fetch options.
            try {
                if (messageSize(command) > MAX_MESSAGE_SIZE) throw new Error('Solution request is too large');
                const data = await host.request(requestBaseUrl, command, controller.signal);
                if (!controller.signal.aborted) channel.port1.postMessage({ id: command.id, ok: true, data });
            } catch {
                if (!controller.signal.aborted)
                    channel.port1.postMessage({ id: command.id, ok: false, error: 'Solution request failed' });
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
                setDocument(
                    `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"><style>${styles.replace(/<\/style/gi, '<\\/style')}</style></head><body class="bg-transparent text-primary"><main id="view" class="flow-root"></main><script>${code}</script></body></html>`
                );
            }
        }
        void bootstrap().catch(() => {
            if (!controller.signal.aborted) setError('The isolated View runtime could not be loaded.');
        });

        // Replacing or unmounting a View revokes its channel and cancels every outstanding operation.
        return () => {
            controller.abort();
            window.removeEventListener('message', ready);
            channel.port1.close();
            channel.port2.close();
        };
    }, [source, parameters, requestBaseUrl, navigationBaseUrl, navigate, kernel]);

    if (kernelError)
        return (
            <PageError title="Unable to load this View" description="The isolated View runtime could not be loaded." />
        );
    if (error) return <PageError title="Unable to load this View" description={error} />;
    return (
        <iframe
            ref={frame}
            title="Solution View"
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            srcDoc={document}
            height={height}
            className="block w-full border-0 bg-transparent"
        />
    );
}
