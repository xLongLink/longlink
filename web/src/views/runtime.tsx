import { z } from 'zod';
import * as React from 'react';
import { transform } from 'sucrase';
import { CircleX } from 'lucide-react';
import * as components from './components';
import { createRoot } from 'react-dom/client';
import { ReportedError } from '@/lib/reported';
import { ErrorBoundary } from 'react-error-boundary';
import { useConfirm } from '@/components/custom/confirmation';
import { FileRequestContext } from '@/components/custom/preview';
import { NativeLoading } from '@/components/custom/native-loading';
import { FileViewerContext } from '@/components/custom/file-context';
import { QueryClient, QueryClientProvider, QueryErrorResetBoundary, useSuspenseQuery } from '@tanstack/react-query';
import {
    FormRequestContext,
    IconRequestContext,
    LinkNavigationContext,
    MenuNavigationContext,
    DialogActivityContext
} from '@/components/custom/contexts';
import {
    requestSchema,
    parametersSchema,
    REQUEST_TIMEOUT,
    MAX_MODAL_DEPTH,
    type RequestCommand,
    type DownloadCommand,
    type PreviewCommand,
    type IconCommand,
    downloadSchema,
    previewSchema,
    type ViewReply,
    type ViewData,
    iconSchema,
    iconDataSchema,
    appearanceMessageSchema,
    type AppearanceMessage,
    viewportMessageSchema,
    type ViewportMessage,
    viewAppearanceSchema,
    type ViewAppearance
} from './protocol';
import '../index.css';

declare global {
    interface Window {
        __VIEW_SESSION__: string;
    }
}

const session = window.__VIEW_SESSION__;

/** Subscribes only to fragment changes inside this sandbox. */
function subscribeToHash(notify: () => void): () => void {
    window.addEventListener('hashchange', notify);

    return () => window.removeEventListener('hashchange', notify);
}

/** Supplies the shared Menu with sandbox-owned fragment navigation. */
function MenuNavigationProvider({ children }: { children: React.ReactNode }) {
    const hash = React.useSyncExternalStore(subscribeToHash, () => window.location.hash);

    // Fragment selection never acquires a host navigation capability.
    return (
        <MenuNavigationContext
            value={{
                hash,
                select: (id) => {
                    window.location.hash = id;
                }
            }}
        >
            {children}
        </MenuNavigationContext>
    );
}

/** Keeps loaded Views and compilation errors in the same content region. */
function ViewLayout({ children }: { children: React.ReactNode }) {
    return (
        <section className="view-runtime-content" aria-label="Solution View">
            {children}
        </section>
    );
}

/** Presents bounded diagnostics without interpreting authored error text as markup. */
function ViewFailure({ title, message, retry }: { title: string; message: string; retry?: () => void }) {
    return (
        <div role="status" className="view-runtime-error">
            <CircleX aria-hidden="true" className="view-runtime-error-icon" />
            <div className="view-runtime-diagnostic" data-retry={retry ? '' : undefined}>
                <h2>{title}</h2>
                <p>{message}</p>
            </div>
            {retry && (
                <div className="view-runtime-error-actions">
                    <components.Button variant="outline" onClick={retry}>
                        Retry
                    </components.Button>
                </div>
            )}
        </div>
    );
}

const initialization = z
    .object({
        session: z.string(),
        source: z.string(),
        params: parametersSchema,
        appearance: viewAppearanceSchema,
        navigationBaseUrl: z.url({ protocol: /^https?$/ })
    })
    .strict();

/** Receives source once from the parent, then accepts capabilities only over the transferred port. */
function initialize(event: MessageEvent<unknown>): void {
    if (event.source !== window.parent || event.ports.length !== 1) return;
    const parsed = initialization.safeParse(event.data);

    if (!parsed.success || parsed.data.session !== session) return;
    window.removeEventListener('message', initialize);
    const port = event.ports[0];
    const mount = document.getElementById('view');

    if (!mount) {
        port.close();

        return;
    }

    // Scope requests and cache state to this admitted sandbox's lifetime.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const lifetime = new AbortController();

    const pending = new Map<
        number,
        { resolve: (value: ViewData) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
    >();

    let sequence = 0;

    /** Requests a scoped Solution operation and refreshes cached data after successful writes. */
    async function request(
        path: string,
        options: Omit<RequestCommand, 'type' | 'id' | 'path' | 'method'> & { method?: RequestCommand['method'] } = {}
    ): Promise<ViewData> {
        const id = sequence++;
        const command = requestSchema.parse({ ...options, type: 'request', id, path, method: options.method ?? 'GET' });

        // Chromium cannot upload disk-backed files received from an opaque-origin frame; copy bytes here.
        for (const entry of command.form ?? []) {
            const value = entry[1];

            if (value instanceof Blob) {
                const bytes = await value.arrayBuffer();
                entry[1] =
                    value instanceof File
                        ? new File([bytes], value.name, { type: value.type, lastModified: value.lastModified })
                        : new Blob([bytes], { type: value.type });
            }
        }

        const data = await exchange(command);

        // Refresh active data and mark inactive resources stale only after the write succeeds.
        if (command.method !== 'GET') await client.invalidateQueries({ queryKey: ['api'] });

        return data;
    }

    /** Owns the deadline and channel transfer for each scoped operation. */
    function exchange(command: RequestCommand | DownloadCommand | PreviewCommand | IconCommand): Promise<ViewData> {
        const { id } = command;

        return new Promise<ViewData>((resolve, reject) => {
            lifetime.signal.throwIfAborted();

            const timer = setTimeout(() => {
                pending.delete(id);
                reject(new Error('Solution request timed out'));
            }, REQUEST_TIMEOUT);

            pending.set(id, { resolve, reject, timer });

            // A failed transfer must release its slot and timer immediately, not at timeout.
            try {
                port.postMessage(command);
            } catch (error) {
                pending.delete(id);
                clearTimeout(timer);
                reject(error);
            }
        });
    }

    /** Requests validated icon geometry from the host. */
    async function loadIcon(name: string) {
        const command = iconSchema.parse({ type: 'icon', id: sequence++, name });
        const data = await exchange(command);

        // Validate icon geometry at the receiving boundary before giving it to Lucide's renderer.
        return iconDataSchema.parse(data);
    }

    /** Keeps images in the sandbox and delegates document previews to the host. */
    async function requestPreview(path: string, title?: string): Promise<Blob | null> {
        if (title !== undefined) {
            const command = previewSchema.parse({ type: 'preview', id: sequence++, path, title: title.slice(0, 256) });
            const data = await exchange(command);

            return z.instanceof(Blob).nullable().parse(data);
        }

        // Binary previews must remain inert file data rather than arbitrary response objects.
        const data = await request(path, { binary: true });

        return z.instanceof(Blob).parse(data);
    }

    /** Asks the host to save an attachment without opening a document inside the sandbox. */
    async function download(path: string, filename: string): Promise<void> {
        const command = downloadSchema.parse({ type: 'download', id: sequence++, path, filename });
        await exchange(command);
    }

    // Supply file previews and downloads without exposing the general request API to file components.
    const fileRequests = { preview: requestPreview, download };

    /** Tracks an inline slot while native document rendering remains host-owned. */
    function mountFileViewer(element: HTMLElement, path: string, title: string): () => void {
        const id = sequence++;
        let animation: number;
        let previous = '';

        /** Transfer geometry only when layout or visibility changes. */
        function measure() {
            const rect = element.getBoundingClientRect();
            const bounds = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
            const serialized = JSON.stringify(bounds);

            if (serialized !== previous) {
                previous = serialized;
                port.postMessage({ type: 'file-viewer', id, path, title: title.slice(0, 256), bounds });
            }

            animation = requestAnimationFrame(measure);
        }

        measure();

        return () => {
            cancelAnimationFrame(animation);
            port.postMessage({ type: 'file-viewer', id, path, title: title.slice(0, 256), bounds: null });
        };
    }

    /** Requests scoped Solution navigation or opens an HTTP(S) URL in a new tab during user activation. */
    function navigate(path: string, newTab = false): void {
        port.postMessage({ type: 'navigate', path, newTab });
    }

    /** Returns Solution data and an awaitable invalidator scoped to the full request path. */
    function useApi(path: string): readonly [ViewData, () => Promise<void>] {
        // Use the full request path as cache identity, including pagination parameters.
        const { data } = useSuspenseQuery({ queryKey: ['api', path], queryFn: () => request(path) });

        const invalidate = React.useCallback(
            () => client.invalidateQueries({ queryKey: ['api', path], exact: true }),
            [path]
        );

        return [data, invalidate];
    }

    port.onmessage = (reply: MessageEvent<ViewReply | AppearanceMessage | ViewportMessage>) => {
        // Host viewport geometry keeps native dialogs inside the visible portion of long Views.
        if ('type' in reply.data && reply.data.type === 'viewport') {
            const viewport = viewportMessageSchema.safeParse(reply.data);

            if (viewport.success) {
                document.documentElement.style.setProperty('--view-viewport-top', `${viewport.data.top}px`);
                document.documentElement.style.setProperty('--view-viewport-bottom', `${viewport.data.bottom}px`);
                document.documentElement.style.setProperty('--view-viewport-height', `${viewport.data.height}px`);
            }

            return;
        }

        // Appearance updates are separate from replies to pending Solution operations.
        if ('type' in reply.data) {
            const appearance = appearanceMessageSchema.safeParse(reply.data);

            if (appearance.success) renderAppearance(appearance.data.appearance);

            return;
        }

        const waiter = pending.get(reply.data.id);

        if (!waiter) return;
        pending.delete(reply.data.id);
        clearTimeout(waiter.timer);

        if (reply.data.ok) {
            waiter.resolve(reply.data.data);
        } else {
            // Preserve host notification ownership when this failure reaches a form or other workflow.
            const error = reply.data.notified ? new ReportedError(reply.data.error) : new Error(reply.data.error);
            waiter.reject(Object.assign(error, { status: reply.data.status }));
        }
    };

    const root = createRoot(mount);
    let modalDepth = 0;
    let fullscreenDepth = 0;

    /** Report bounded modal nesting without granting the sandbox control over host geometry or styles. */
    function modalActivity(open: boolean, fullscreen: boolean): void {
        if (lifetime.signal.aborted) return;
        modalDepth += open ? 1 : -1;

        if (fullscreen) fullscreenDepth += open ? 1 : -1;

        const command = { type: 'modal', depth: Math.min(MAX_MODAL_DEPTH, Math.max(0, modalDepth)) };

        port.postMessage(fullscreenDepth > 0 ? { ...command, fullscreen: true } : command);
    }

    // Report natural content height, including async data and wrapping, over the private channel.
    const observer = new ResizeObserver(() => {
        port.postMessage({
            type: 'resize',
            height: Math.min(1_000_000, Math.max(1, Math.ceil(mount.getBoundingClientRect().height)))
        });
    });

    observer.observe(mount);

    // Release all resources acquired by this initialized sandbox in one teardown.
    window.addEventListener(
        'pagehide',
        () => {
            port.postMessage({ type: 'modal', depth: 0 });
            lifetime.abort();
            observer.disconnect();

            for (const waiter of pending.values()) {
                clearTimeout(waiter.timer);
                waiter.reject(new Error('View closed'));
            }

            pending.clear();
            port.close();
        },
        { once: true }
    );

    let content: React.ReactNode;

    // Compilation and evaluation happen only in the sandbox, never in the Platform module graph.
    try {
        const code = transform(parsed.data.source, {
            transforms: ['jsx', 'imports'],
            jsxRuntime: 'classic',
            jsxPragma: '__jsx',
            jsxFragmentPragma: 'Fragment',
            production: true
        }).code;

        const bindings = {
            // Keep JSX compilation separate from the public View API.
            __jsx: React.createElement,
            Fragment: React.Fragment,
            useState: React.useState,
            useEffect: React.useEffect,
            useMemo: React.useMemo,
            useRef: React.useRef,
            ...components,
            request,
            navigate,
            useApi,
            useConfirm
        };

        type ViewComponent = React.ComponentType<{ params: Readonly<Record<string, string>> }>;

        const module = { exports: {} };

        // oxlint-disable-next-line typescript/no-implied-eval -- This entry runs exclusively in the opaque-origin sandbox.
        const evaluate = new Function(
            'module',
            'exports',
            ...Object.keys(bindings),
            `${code}\nreturn module.exports.default;`
        );

        // A callable export is the admission contract; React's error boundary handles invalid component rendering.
        const component: unknown = evaluate(module, module.exports, ...Object.values(bindings));

        if (!(component instanceof Function)) throw new Error('A View must export a component as default');

        // SAFETY: Callable exports pass admission above; the error boundary handles invalid React rendering.
        const View = component as ViewComponent;

        const params = Object.freeze(parsed.data.params);
        content = (
            <QueryClientProvider client={client}>
                <QueryErrorResetBoundary>
                    {({ reset }) => (
                        <ViewLayout>
                            <ErrorBoundary
                                onReset={reset}
                                fallbackRender={({ error, resetErrorBoundary }) => (
                                    <ViewFailure
                                        title="View could not be loaded"
                                        message={
                                            error instanceof Error
                                                ? error.message.slice(0, 1024)
                                                : 'An unexpected View error occurred.'
                                        }
                                        retry={resetErrorBoundary}
                                    />
                                )}
                            >
                                <React.Suspense
                                    fallback={
                                        <div className="view-runtime-loading">
                                            <NativeLoading label="Loading View" />
                                        </div>
                                    }
                                >
                                    <IconRequestContext value={loadIcon}>
                                        <LinkNavigationContext
                                            value={{ baseUrl: parsed.data.navigationBaseUrl, navigate }}
                                        >
                                            <MenuNavigationProvider>
                                                <FileRequestContext value={fileRequests}>
                                                    <FileViewerContext value={mountFileViewer}>
                                                        <DialogActivityContext value={modalActivity}>
                                                            <FormRequestContext value={request}>
                                                                <View params={params} />
                                                            </FormRequestContext>
                                                        </DialogActivityContext>
                                                    </FileViewerContext>
                                                </FileRequestContext>
                                            </MenuNavigationProvider>
                                        </LinkNavigationContext>
                                    </IconRequestContext>
                                </React.Suspense>
                            </ErrorBoundary>
                        </ViewLayout>
                    )}
                </QueryErrorResetBoundary>
            </QueryClientProvider>
        );
    } catch (error) {
        // Compilation diagnostics belong to the authored source, not privileged host state.
        content = (
            <ViewLayout>
                <ViewFailure
                    title="View compilation failed"
                    message={
                        error instanceof Error
                            ? error.message.slice(0, 1024)
                            : 'Export a default JSX component without package imports.'
                    }
                />
            </ViewLayout>
        );
    }

    /** Updates document appearance without reconciling or remounting the authored View. */
    function renderAppearance(appearance: ViewAppearance) {
        document.documentElement.dataset.themeScope = 'stone';
        document.documentElement.dataset.accent = appearance.accent;

        // An absent override lets color-scheme and dark utilities follow the live system preference.
        if (appearance.theme === 'system') delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = appearance.theme;
    }

    // Start from the handshake, then receive live preferences over the private port.
    renderAppearance(parsed.data.appearance);
    root.render(content);
}

// A fresh opaque-origin frame cannot read parent state, storage, or cookies.
window.addEventListener('message', initialize);

window.parent.postMessage(session, '*');
