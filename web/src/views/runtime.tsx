import { z } from 'zod';
import * as React from 'react';
import { transform } from 'sucrase';
import * as components from './index';
import { CircleX } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { ReportedError } from '@/lib/reported';
import { ErrorBoundary } from 'react-error-boundary';
import { Spinner } from '@/components/shadcn/spinner';
import { appearanceSchema, type Appearance } from '@/lib/appearance';
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/reui/alert';
import { QueryClient, QueryClientProvider, QueryErrorResetBoundary } from '@tanstack/react-query';
import {
    RequestContext,
    LinkNavigationContext,
    MenuNavigationContext,
    DialogActivityContext
} from '@/lib/view-capabilities';
import {
    requestSchema,
    parametersSchema,
    REQUEST_TIMEOUT,
    type RequestCommand,
    type RequestOptions,
    type DownloadCommand,
    downloadSchema,
    type ViewReply,
    type ViewData,
    appearanceMessageSchema,
    type AppearanceMessage
} from './protocol';
import '../theme.css';

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
        <section className="min-h-full min-w-0 p-0" aria-label="Solution View">
            {children}
        </section>
    );
}

/** Presents bounded diagnostics without interpreting authored error text as markup. */
function ViewFailure({ title, message, retry }: { title: string; message: string; retry?: () => void }) {
    return (
        <Alert role="status" variant="destructive">
            <CircleX aria-hidden="true" />
            <AlertTitle className="line-clamp-none wrap-anywhere">
                <h2>{title}</h2>
            </AlertTitle>
            <AlertDescription className="min-w-0 wrap-anywhere">
                <p>{message}</p>
            </AlertDescription>
            {retry && (
                <AlertAction>
                    <components.Button type="button" variant="outline" onClick={retry}>
                        Retry
                    </components.Button>
                </AlertAction>
            )}
        </Alert>
    );
}

const initialization = z
    .object({
        session: z.string(),
        source: z.string(),
        params: parametersSchema,
        appearance: appearanceSchema,
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
    async function request(path: string, options: RequestOptions = {}): Promise<ViewData> {
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
    function exchange(command: RequestCommand | DownloadCommand): Promise<ViewData> {
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

    /** Asks the host to save an attachment without opening a document inside the sandbox. */
    async function download(path: string, filename: string): Promise<void> {
        const name = filename.replace(/[/\\\p{Cc}]/gu, '_').slice(0, 256) || 'attachment';
        const command = downloadSchema.parse({ type: 'download', id: sequence++, path, filename: name });
        await exchange(command);
    }

    const requests = { request };

    /** Requests scoped Solution navigation. */
    function navigate(path: string): void {
        port.postMessage({ type: 'navigate', path });
    }

    port.onmessage = (reply: MessageEvent<ViewReply | AppearanceMessage>) => {
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

    /** Report modal presence without granting the sandbox control over host geometry or styles. */
    function modalActivity(open: boolean): void {
        if (lifetime.signal.aborted) return;
        const wasOpen = modalDepth > 0;
        modalDepth += open ? 1 : -1;
        const isOpen = modalDepth > 0;

        if (wasOpen !== isOpen) port.postMessage({ type: 'modal', open: isOpen });
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
            port.postMessage({ type: 'modal', open: false });
            lifetime.abort();
            observer.disconnect();
            for (const waiter of pending.values()) {
                clearTimeout(waiter.timer);
                waiter.reject(new Error('View closed'));
            }

            pending.clear();
            root.unmount();
            client.clear();
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
            jsxFragmentPragma: '__fragment',
            production: true
        }).code;

        const bindings = {
            // Keep JSX compilation separate from the public View API.
            __jsx: React.createElement,
            __fragment: React.Fragment,
            ...components
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
                                    <div className="grid min-h-dvh w-full place-items-center">
                                        <Spinner aria-label="Loading View" className="motion-reduce:animate-none" />
                                    </div>
                                }
                            >
                                <LinkNavigationContext
                                    value={{ baseUrl: parsed.data.navigationBaseUrl, navigate, download }}
                                >
                                    <MenuNavigationProvider>
                                        <DialogActivityContext value={modalActivity}>
                                            <RequestContext value={requests}>
                                                <View params={params} />
                                            </RequestContext>
                                        </DialogActivityContext>
                                    </MenuNavigationProvider>
                                </LinkNavigationContext>
                            </React.Suspense>
                        </ErrorBoundary>
                    )}
                </QueryErrorResetBoundary>
            </QueryClientProvider>
        );
    } catch (error) {
        // Compilation diagnostics belong to the authored source, not privileged host state.
        content = (
            <ViewFailure
                title="View compilation failed"
                message={
                    error instanceof Error
                        ? error.message.slice(0, 1024)
                        : 'Export a default JSX component without package imports.'
                }
            />
        );
    }

    /** Updates document appearance without reconciling or remounting the authored View. */
    function renderAppearance(appearance: Appearance) {
        document.documentElement.dataset.themeScope = 'stone';

        // An absent override lets color-scheme and dark utilities follow the live system preference.
        if (appearance.theme === 'system') delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = appearance.theme;
    }

    // Start from the handshake, then receive live preferences over the private port.
    renderAppearance(parsed.data.appearance);
    root.render(<ViewLayout>{content}</ViewLayout>);
}

// A fresh opaque-origin frame cannot read parent state, storage, or cookies.
window.addEventListener('message', initialize);

window.parent.postMessage(session, '*');
