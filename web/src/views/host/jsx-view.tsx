import { ApiError } from '@/lib/api';
import * as icons from '@/lib/icons';
import * as host from '@/views/host';
import { useApiError } from '@/lib/errors';
import { useNavigate } from 'react-router';
import type { Appearance } from '@/lib/appearance';
import { sha256Hex } from '@/views/host/integrity';
import type { ViewRuntime } from '@/views/manifest';
import { useAppearance } from '@/lib/hooks/use-appearance';
import { useScrollLock } from '@base-ui/utils/useScrollLock';
import { PageError, PageLoading } from '@/components/ui/utils';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { requestUrl, resolveExternalUrl, resolveScopedNavigationUrl } from '@/lib/url';
import { commandSchema, parametersSchema, iconDataSchema, moduleRequestSchema, type ViewData } from '@/views/protocol';

const BOOTSTRAP_TIMEOUT_MS = 10_000;

const STARTUP_FAILURES = {
    assets: 'The View runtime assets could not be loaded or did not match the manifest.',
    preparation: 'The isolated View document could not be prepared.',
    transfer: 'The isolated View could not receive its startup capabilities.',
    readiness: 'The isolated View did not become ready within 10 seconds.'
} as const;

/** Renders Solution code only in a credential-free, opaque-origin sandbox. */
export function JsxView({
    source,
    params,
    requestBaseUrl,
    navigationBaseUrl,
    runtime,
    kernel
}: {
    source: string;
    params: Record<string, string>;
    requestBaseUrl: string;
    navigationBaseUrl: string;
    runtime: ViewRuntime;
    kernel: { script: string; styles: string };
}) {
    const frame = useRef<HTMLIFrameElement>(null);

    const { theme } = useAppearance();

    const currentAppearance = useRef<Appearance>({ theme });

    const appearancePort = useRef<MessagePort | null>(null);
    const navigate = useNavigate();
    const reportError = useApiError();
    const [height, setHeight] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);

    // Share scroll-lock ownership with native Base UI overlays covering the Platform.
    useScrollLock(modalOpen);

    // Promote the existing frame without reparenting it, which would reload its document and lose View state.
    useLayoutEffect(() => {
        const element = frame.current;

        if (!modalOpen || !element) return;
        element.showPopover();
        const siblings = new Map<HTMLElement, boolean>();

        // Preserve host pull-to-refresh suppression while the sandbox owns the viewport.
        const overscroll = new Map<HTMLElement, string>();

        for (const root of [document.documentElement, document.body]) {
            overscroll.set(root, root.style.overscrollBehaviorY);
            root.style.overscrollBehaviorY = 'none';
        }

        // Keep host controls out of keyboard and assistive-technology navigation during the fullscreen modal.
        for (
            let ancestor: HTMLElement = element;
            ancestor.parentElement && ancestor !== document.body;
            ancestor = ancestor.parentElement
        ) {
            for (const sibling of ancestor.parentElement.children) {
                if (sibling instanceof HTMLElement && sibling !== ancestor) {
                    siblings.set(sibling, sibling.inert);
                    sibling.inert = true;
                }
            }
        }

        return () => {
            if (element.matches(':popover-open')) element.hidePopover();

            for (const [sibling, inert] of siblings) sibling.inert = inert;

            for (const [root, value] of overscroll) {
                if (root.style.overscrollBehaviorY === 'none') root.style.overscrollBehaviorY = value;
            }
        };
    }, [modalOpen]);

    const [bootstrapState, setBootstrapState] = useState<
        | { status: 'preparing' }
        | { status: 'prepared'; document: string }
        | { status: 'failed'; stage: keyof typeof STARTUP_FAILURES }
    >({ status: 'preparing' });

    const parameters = JSON.stringify(params);

    // Update the mounted View without replacing its document or losing authored state.
    useEffect(() => {
        currentAppearance.current = { theme };
        appearancePort.current?.postMessage({ type: 'appearance', appearance: currentAppearance.current });
    }, [theme]);

    useEffect(() => {
        const { script, styles } = kernel;
        const controller = new AbortController();
        const channel = new MessageChannel();
        const assets = runtime.modules ? new MessageChannel() : undefined;
        const session = crypto.randomUUID();
        const pending = new Set<number>();
        let handshakeTimer: ReturnType<typeof setTimeout> | undefined;

        /** Revokes the attempt's capabilities and startup deadline on failure or unmount. */
        function dispose(): void {
            controller.abort();
            setModalOpen(false);
            clearTimeout(handshakeTimer);
            window.removeEventListener('message', ready);

            if (appearancePort.current === channel.port1) appearancePort.current = null;
            channel.port1.close();
            channel.port2.close();
            assets?.port1.close();
            assets?.port2.close();
        }

        /** Reports startup failure only while this attempt still owns the mounted frame. */
        function fail(stage: keyof typeof STARTUP_FAILURES, errorType = 'Error'): void {
            if (controller.signal.aborted) return;
            dispose();

            // Keep technical diagnostics local to development without exposing exception messages or payloads.
            if (import.meta.env.DEV) console.error('View startup failed:', stage, errorType);
            setBootstrapState({ status: 'failed', stage });
        }

        /** Connects only this sandbox instance; subsequent window messages have no capabilities. */
        function ready(event: MessageEvent<unknown>): void {
            if (controller.signal.aborted) return;

            if (event.source !== frame.current?.contentWindow || event.origin !== 'null') return;

            if (event.data !== session) return;
            window.removeEventListener('message', ready);

            // A failed capability transfer is a startup failure, not a connected runtime.
            try {
                frame.current?.contentWindow?.postMessage(
                    {
                        session,
                        source,
                        params: parametersSchema.parse(JSON.parse(parameters)),
                        navigationBaseUrl: new URL(navigationBaseUrl, window.location.origin).href,
                        appearance: currentAppearance.current
                    },
                    '*',
                    assets ? [channel.port2, assets.port2] : [channel.port2]
                );
                appearancePort.current = channel.port1;

                clearTimeout(handshakeTimer);
            } catch (error) {
                fail('transfer', error instanceof Error ? error.name : 'Error');
            }
        }

        // Authenticate the bootstrap by its WindowProxy and fresh session before transferring a private port.
        window.addEventListener('message', ready);

        // Serve only manifest-listed JavaScript from this Solution, never host imports or caller-selected URLs.
        if (assets && runtime.modules) {
            const manifest = runtime.modules;
            const modules = new Map<string, Promise<string>>();

            assets.port1.onmessage = async (event: MessageEvent<unknown>) => {
                if (controller.signal.aborted) return;
                const parsed = moduleRequestSchema.safeParse(event.data);

                if (!parsed.success) {
                    fail('assets');

                    return;
                }

                const { id, path } = parsed.data;

                try {
                    if (!Object.hasOwn(manifest, path)) {
                        throw new Error('Module is not part of the Solution runtime');
                    }

                    const expectedVersion = manifest[path];
                    let source = modules.get(path);

                    if (!source) {
                        source = (async () => {
                            const url = new URL(requestUrl(requestBaseUrl, `views/${path}`), window.location.origin);
                            url.searchParams.set('v', runtime.version);
                            const body = await host.load(url.href, { signal: controller.signal });
                            const bytes = await body.arrayBuffer();
                            const version = await sha256Hex(bytes);

                            if (version !== expectedVersion) throw new Error('Solution module integrity mismatch');

                            return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
                        })();
                        modules.set(path, source);
                    }

                    const text = await source;

                    if (!controller.signal.aborted) assets.port1.postMessage({ id, source: text });
                } catch {
                    if (!controller.signal.aborted)
                        assets.port1.postMessage({ id, error: 'Solution module unavailable' });
                }
            };
        }

        channel.port1.onmessage = async (event: MessageEvent<unknown>) => {
            const parsed = commandSchema.safeParse(event.data);

            if (!parsed.success || controller.signal.aborted) return;
            const command = parsed.data;

            // Size the isolated document without creating a second page scrollport.
            if (command.type === 'resize') {
                setHeight(command.height);

                return;
            }

            // Keep modal content sandboxed; only the host can promote its frame over Platform navigation.
            if (command.type === 'modal') {
                setModalOpen(command.open);

                return;
            }

            if (command.type === 'navigate') {
                try {
                    // Open web destinations only during user activation, without exposing the host to the new page.
                    const externalUrl = resolveExternalUrl(window.location.origin, command.path);

                    if (externalUrl) {
                        if (navigator.userActivation.isActive)
                            window.open(externalUrl, '_blank', 'noopener,noreferrer');

                        return;
                    }

                    // Keep relative navigation scoped to the current Solution.
                    const destination = resolveScopedNavigationUrl(navigationBaseUrl, command.path);

                    if (!destination) return;

                    if (!command.newTab) {
                        await navigate(destination);

                        return;
                    }

                    if (navigator.userActivation.isActive) {
                        window.open(destination, '_blank', 'noopener,noreferrer');
                    }
                } catch {
                    // Invalid navigation does not acquire any host capability.
                }

                return;
            }

            if (pending.has(command.id)) return;

            pending.add(command.id);

            // The frame chooses a catalog icon or Solution-relative operation, never URLs or fetch options.
            try {
                let data: ViewData;

                if (command.type === 'icon') {
                    // Older SDKs use this bridge; chunked runtimes must use their own packaged icons.
                    if (runtime.modules) throw new Error('Icons must belong to the Solution runtime');
                    const icon = await icons.load(command.name);
                    data = iconDataSchema.parse(icon);
                } else if (command.type === 'download') {
                    data = await host.download(requestBaseUrl, command, controller.signal);
                } else {
                    data = await host.request(requestBaseUrl, command, controller.signal);
                }

                if (!controller.signal.aborted) channel.port1.postMessage({ id: command.id, ok: true, data });
            } catch (error) {
                const failure = host.requestError(error);

                if (controller.signal.aborted) return;

                // Keep icon fallback local while Solution operations use the page-owned notification layer.
                const notified = command.type !== 'icon';

                if (notified) reportError(new ApiError(failure.error, failure.status ?? 0));
                channel.port1.postMessage({ id: command.id, ok: false, ...failure, notified });
            } finally {
                pending.delete(command.id);
            }
        };

        /** Confines runtime assets to the sandbox; View source is transferred as data, never interpolated into HTML. */
        async function bootstrap(): Promise<void> {
            const code = `window.__VIEW_SESSION__=${JSON.stringify(session)};\n${script}`.replace(
                /<\/script/gi,
                '<\\/script'
            );

            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
            const hash = btoa(String.fromCharCode(...new Uint8Array(digest)));
            // Bundle map and PDF workers locally; external requests remain limited to CARTO assets.
            const mapSources = runtime.modules
                ? 'https://basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com'
                : '';
            const policy = `default-src 'none'; script-src 'sha256-${hash}' 'unsafe-eval'${runtime.modules ? ' blob:' : ''}; style-src 'unsafe-inline'; img-src data: blob:${mapSources ? ` ${mapSources}` : ''}; media-src blob:; font-src data: blob:; connect-src ${mapSources ? `data: ${mapSources}` : "'none'"}; frame-src 'none'; worker-src ${runtime.modules ? 'data:' : "'none'"}; object-src 'none'; base-uri 'none'; form-action 'none'`;

            if (!controller.signal.aborted) {
                // A blocked bootstrap script must surface an error instead of leaving a blank frame.
                // oxlint-disable-next-line react/immutability -- Effect-local cleanup; oxc-project/oxc#28401.
                handshakeTimer = setTimeout(() => fail('readiness'), BOOTSTRAP_TIMEOUT_MS);
                const appearance = currentAppearance.current;
                const mode = appearance.theme === 'system' ? '' : ` data-theme="${appearance.theme}"`;
                const document = `<!doctype html><html class="overflow-hidden [scrollbar-gutter:auto]" data-theme-scope="stone"${mode}><head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"><style>${styles.replace(/<\/style/gi, '<\\/style')}</style></head><body class="overflow-hidden bg-transparent text-foreground"><main id="view"></main><script>${code}</script></body></html>`;

                // Keep startup failure latched until the route owner mounts a fresh View.
                setBootstrapState((current) =>
                    current.status === 'failed' ? current : { status: 'prepared', document }
                );
            }
        }

        void bootstrap().catch(() => fail('preparation'));

        // Replacing or unmounting a View revokes its channel and cancels every outstanding operation.
        return dispose;
    }, [source, parameters, requestBaseUrl, navigationBaseUrl, navigate, reportError, kernel, runtime]);

    if (bootstrapState.status === 'failed')
        return <PageError title="Unable to load this View" description={STARTUP_FAILURES[bootstrapState.stage]} />;

    // Keep document preparation visible before mounting the sandbox.
    if (bootstrapState.status === 'preparing') return <PageLoading label="Preparing View" />;

    return (
        <div className="relative flex min-h-(--page-content-height) flex-col" style={{ height }}>
            <iframe
                ref={frame}
                title="Solution View"
                // Open native links without passing sandbox restrictions to their destinations; the View stays isolated.
                sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
                srcDoc={bootstrapState.document}
                popover={modalOpen ? 'manual' : undefined}
                className={
                    modalOpen
                        ? 'fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0'
                        : 'block h-full w-full flex-1 shrink-0 border-0 bg-transparent'
                }
            />
        </div>
    );
}
