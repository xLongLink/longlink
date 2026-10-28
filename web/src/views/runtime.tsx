import { z } from 'zod';
import * as React from 'react';
import { transform } from 'sucrase';
import * as components from './components';
import { createRoot } from 'react-dom/client';
import { ReportedError } from '@/lib/reported';
import { Theme } from '@astryxdesign/core/theme';
import { Banner } from '@astryxdesign/core/Banner';
import { Spinner } from '@astryxdesign/core/Spinner';
import { ErrorBoundary } from 'react-error-boundary';
import { stoneTheme } from '@/lib/generated/stone.js';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { FormRequestContext } from '@/components/ui/Form';
import { IconRequestContext } from '@/components/ui/Icon';
import { LinkNavigationContext } from '@/components/ui/Link';
import { MenuNavigationContext } from '@/components/ui/Menu';
import { FileRequestContext } from '@/components/ui/preview';
import { DialogActivityContext } from '@/components/ui/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { appearanceSchema, type Appearance } from '@/lib/appearance';
import { QueryClient, QueryClientProvider, QueryErrorResetBoundary, useSuspenseQuery } from '@tanstack/react-query';
import {
    requestSchema,
    parametersSchema,
    REQUEST_TIMEOUT,
    MAX_MODAL_DEPTH,
    type RequestCommand,
    type DownloadCommand,
    type IconCommand,
    downloadSchema,
    type ViewReply,
    type ViewData,
    iconSchema,
    iconDataSchema,
    appearanceMessageSchema,
    type AppearanceMessage,
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
                },
            }}
        >
            {children}
        </MenuNavigationContext>
    );
}

/** Keeps loaded Views and compilation errors in the same content region. */
function ViewLayout({ children }: { children: React.ReactNode }) {
    return (
        <Layout height="auto">
            <LayoutContent padding={0} isScrollable={false} label="Solution View" role="region">
                {children}
            </LayoutContent>
        </Layout>
    );
}

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const lifetime = new AbortController();

const pending = new Map<
    number,
    {
        resolve: (value: ViewData) => void;
        reject: (error: Error) => void;
        timer: ReturnType<typeof setTimeout>;
    }
>();

let sequence = 0;

let port: MessagePort;

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
function exchange(command: RequestCommand | DownloadCommand | IconCommand): Promise<ViewData> {
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

/** Supplies binary previews without limiting concurrent image loads. */
async function requestImage(path: string): Promise<Blob> {
    // Binary previews must remain inert file data rather than arbitrary response objects.
    const data = await request(path, { binary: true });

    return z.instanceof(Blob).parse(data);
}

/** Asks the host to save an attachment without opening a document inside the sandbox. */
async function download(path: string, filename: string): Promise<void> {
    const command = downloadSchema.parse({ type: 'download', id: sequence++, path, filename });
    await exchange(command);
}

// Supply image previews and downloads without exposing the general request API to file components.
const fileRequests = { preview: requestImage, download };

/** Requests scoped Solution navigation or opens an HTTP(S) URL in a new tab during user activation. */
function navigate(path: string, newTab = false): void {
    port.postMessage({ type: 'navigate', path, newTab });
}

/** Returns Solution data and an awaitable invalidator scoped to the full request path. */
function useApi(path: string): readonly [ViewData, () => Promise<void>] {
    // Use the full request path as cache identity, including pagination parameters.
    const { data } = useSuspenseQuery({
        queryKey: ['api', path],
        queryFn: () => request(path),
    });

    const invalidate = React.useCallback(
        () => client.invalidateQueries({ queryKey: ['api', path], exact: true }),
        [path]
    );

    return [data, invalidate];
}

const initialization = z
    .object({
        session: z.string(),
        source: z.string(),
        params: parametersSchema,
        appearance: appearanceSchema,
        navigationBaseUrl: z.url({ protocol: /^https?$/ }),
    })
    .strict();

/** Receives source once from the parent, then accepts capabilities only over the transferred port. */
function initialize(event: MessageEvent<unknown>): void {
    if (event.source !== window.parent || event.ports.length !== 1) return;
    const parsed = initialization.safeParse(event.data);

    if (!parsed.success || parsed.data.session !== session) return;
    window.removeEventListener('message', initialize);
    port = event.ports[0];
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

    const mount = document.getElementById('view');

    if (!mount) {
        port.close();

        return;
    }

    const root = createRoot(mount);
    let modalDepth = 0;

    /** Report bounded modal nesting without granting the sandbox control over host geometry or styles. */
    function modalActivity(open: boolean): void {
        if (lifetime.signal.aborted) return;
        modalDepth += open ? 1 : -1;
        port.postMessage({ type: 'modal', depth: Math.min(MAX_MODAL_DEPTH, Math.max(0, modalDepth)) });
    }

    // Report natural content height, including async data and wrapping, over the private channel.
    const observer = new ResizeObserver(() => {
        port.postMessage({
            type: 'resize',
            height: Math.min(1_000_000, Math.max(1, Math.ceil(mount.getBoundingClientRect().height))),
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
            production: true,
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
            <LayerProvider toast={{ position: 'bottomEnd' }}>
                <QueryClientProvider client={client}>
                    <QueryErrorResetBoundary>
                        {({ reset }) => (
                            <ViewLayout>
                                <ErrorBoundary
                                    onReset={reset}
                                    fallbackRender={({ error, resetErrorBoundary }) => (
                                        <Banner
                                            role="status"
                                            status="error"
                                            title="View could not be loaded"
                                            description={
                                                error instanceof Error
                                                    ? error.message.slice(0, 1024)
                                                    : 'An unexpected View error occurred.'
                                            }
                                            endContent={
                                                <components.Button label="Retry" onClick={resetErrorBoundary} />
                                            }
                                        />
                                    )}
                                >
                                    <React.Suspense fallback={<Spinner label="Loading View" />}>
                                        <IconRequestContext value={loadIcon}>
                                            <LinkNavigationContext
                                                value={{ baseUrl: parsed.data.navigationBaseUrl, navigate }}
                                            >
                                                <MenuNavigationProvider>
                                                    <FileRequestContext value={fileRequests}>
                                                        <DialogActivityContext value={modalActivity}>
                                                            <FormRequestContext value={request}>
                                                                <View params={params} />
                                                            </FormRequestContext>
                                                        </DialogActivityContext>
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
            </LayerProvider>
        );
    } catch (error) {
        // Compilation diagnostics belong to the authored source, not privileged host state.
        content = (
            <ViewLayout>
                <Banner
                    role="status"
                    status="error"
                    title="View compilation failed"
                    description={
                        error instanceof Error
                            ? error.message.slice(0, 1024)
                            : 'Export a default JSX component without package imports.'
                    }
                />
            </ViewLayout>
        );
    }

    /** Reconciles only the theme provider so the authored component keeps its state. */
    function renderAppearance(appearance: Appearance) {
        document.documentElement.dataset.accent = appearance.accent;
        root.render(
            <Theme theme={stoneTheme} mode={appearance.theme}>
                {content}
            </Theme>
        );
    }

    // Start from the handshake, then receive live preferences over the private port.
    renderAppearance(parsed.data.appearance);
}

// A fresh opaque-origin frame cannot read parent state, storage, or cookies.
window.addEventListener('message', initialize);

window.parent.postMessage(session, '*');
