import { z } from 'zod';
import * as React from 'react';
import { transform } from 'sucrase';
import { stoneTheme } from '@/theme';
import * as components from './components';
import { createRoot } from 'react-dom/client';
import { Theme } from '@astryxdesign/core/theme';
import { Banner } from '@astryxdesign/core/Banner';
import { Spinner } from '@astryxdesign/core/Spinner';
import { ErrorBoundary } from 'react-error-boundary';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { FormRequestContext } from '@/components/ui/Form';
import { LinkNavigationContext } from '@/components/ui/Link';
import { MenuNavigationContext } from '@/components/ui/Menu';
import { FileRequestContext } from '@/components/ui/FileViewer';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { QueryClient, QueryClientProvider, QueryErrorResetBoundary, useSuspenseQuery } from '@tanstack/react-query';
import {
    requestSchema,
    parametersSchema,
    messageSize,
    MAX_MESSAGE_SIZE,
    MAX_PENDING_REQUESTS,
    REQUEST_TIMEOUT,
    type RequestCommand,
    type DownloadCommand,
    downloadSchema,
    type ViewReply,
} from './protocol';
import './theme.css';

declare global {
    interface Window {
        __VIEW_SESSION__: string;
    }
}

const session = window.__VIEW_SESSION__;
const fileRequests = { preview: requestImage, download };

/** Subscribes only to fragment changes inside this sandbox. */
function subscribeToHash(notify: () => void): () => void {
    window.addEventListener('hashchange', notify);
    return () => window.removeEventListener('hashchange', notify);
}

/** Supplies the shared Menu with sandbox-owned fragment navigation. */
function MenuNavigationProvider({ children }: { children: React.ReactNode }) {
    const hash = React.useSyncExternalStore(
        subscribeToHash,
        () => window.location.hash,
        () => ''
    );

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
            <LinkNavigationContext value={navigate}>
                <FileRequestContext value={fileRequests}>
                    <FormRequestContext value={request}>{children}</FormRequestContext>
                </FileRequestContext>
            </LinkNavigationContext>
        </MenuNavigationContext>
    );
}
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
>();
let sequence = 0;
let port: MessagePort;

/** Requests a scoped Solution operation and refreshes cached data after successful writes. */
async function request(
    path: string,
    options: Omit<RequestCommand, 'type' | 'id' | 'path' | 'method'> & { method?: RequestCommand['method'] } = {}
): Promise<unknown> {
    const id = sequence++;
    const command = requestSchema.parse({ ...options, type: 'request', id, path, method: options.method ?? 'GET' });
    if (messageSize(command) > MAX_MESSAGE_SIZE) throw new Error('Solution request is too large');
    const data = await exchange(command);

    // Refresh active data and mark inactive resources stale only after the write succeeds.
    if (command.method !== 'GET') await client.invalidateQueries();

    return data;
}

/** Owns the pending slot, deadline, and channel transfer for each scoped operation. */
async function exchange(command: RequestCommand | DownloadCommand): Promise<unknown> {
    if (pending.size >= MAX_PENDING_REQUESTS) throw new Error('Too many pending requests');
    const { id } = command;
    return new Promise<unknown>((resolve, reject) => {
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

/** Supplies a stable binary-request capability without exposing the general request API to image components. */
function requestImage(path: string): Promise<unknown> {
    return request(path, { binary: true });
}

/** Asks the host to save a bounded attachment without opening a document inside the sandbox. */
async function download(path: string, filename: string): Promise<void> {
    const command = downloadSchema.parse({ type: 'download', id: sequence++, path, filename });
    await exchange(command);
}

/** Requests navigation inside the host's Solution route prefix. */
function navigate(path: string): void {
    port.postMessage({ type: 'navigate', path });
}

/** Returns Solution data and an awaitable invalidator scoped to the full request path. */
function useApi(path: string): readonly [unknown, () => Promise<void>] {
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

const initialization = z.object({ session: z.string(), source: z.string(), params: parametersSchema }).strict();

/** Receives source once from the parent, then accepts capabilities only over the transferred port. */
function initialize(event: MessageEvent<unknown>): void {
    if (event.source !== window.parent || event.ports.length !== 1) return;
    const parsed = initialization.safeParse(event.data);
    if (!parsed.success || parsed.data.session !== session) return;
    window.removeEventListener('message', initialize);
    port = event.ports[0];
    port.onmessage = (reply: MessageEvent<ViewReply>) => {
        const waiter = pending.get(reply.data.id);
        if (!waiter) return;
        pending.delete(reply.data.id);
        clearTimeout(waiter.timer);
        if (reply.data.ok) waiter.resolve(reply.data.data);
        else waiter.reject(Object.assign(new Error(reply.data.error), { status: reply.data.status }));
    };
    const mount = document.getElementById('view');
    if (!mount) {
        port.close();
        return;
    }
    const root = createRoot(mount);

    // Release all resources acquired by this initialized sandbox in one teardown.
    window.addEventListener(
        'pagehide',
        () => {
            for (const waiter of pending.values()) {
                clearTimeout(waiter.timer);
                waiter.reject(new Error('View closed'));
            }
            pending.clear();
            port.close();
        },
        { once: true }
    );

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
        const module = { exports: {} as { default?: React.ComponentType } };
        // oxlint-disable-next-line typescript/no-implied-eval -- This entry runs exclusively in the opaque-origin sandbox.
        const evaluate = new Function(
            'module',
            'exports',
            ...Object.keys(bindings),
            `${code}\nreturn module.exports.default;`
        );
        const result: unknown = evaluate(module, module.exports, ...Object.values(bindings));
        if (typeof result !== 'function') throw new Error('A View must export a component as default');
        const View = result as React.ComponentType<{ params: Readonly<Record<string, string>> }>;
        const params = Object.freeze(parsed.data.params);
        root.render(
            <Theme theme={stoneTheme} mode="dark">
                <LayerProvider toast={{ position: 'bottomEnd' }}>
                    <QueryClientProvider client={client}>
                        <QueryErrorResetBoundary>
                            {({ reset }) => (
                                <Layout height="fill">
                                    <LayoutContent padding={0} label="Solution View" role="region">
                                        <ErrorBoundary
                                            onReset={reset}
                                            fallbackRender={({ error, resetErrorBoundary }) => (
                                                <Banner
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
                                                <MenuNavigationProvider>
                                                    <View params={params} />
                                                </MenuNavigationProvider>
                                            </React.Suspense>
                                        </ErrorBoundary>
                                    </LayoutContent>
                                </Layout>
                            )}
                        </QueryErrorResetBoundary>
                    </QueryClientProvider>
                </LayerProvider>
            </Theme>
        );
    } catch (error) {
        // Compilation diagnostics belong to the authored source, not privileged host state.
        root.render(
            <Theme theme={stoneTheme} mode="dark">
                <Layout height="fill">
                    <LayoutContent padding={0} label="Solution View" role="region">
                        <Banner
                            status="error"
                            title="View compilation failed"
                            description={
                                error instanceof Error
                                    ? error.message.slice(0, 1024)
                                    : 'Export a default JSX component without package imports.'
                            }
                        />
                    </LayoutContent>
                </Layout>
            </Theme>
        );
    }
}

// A fresh opaque-origin frame cannot read parent state, storage, or cookies.
window.addEventListener('message', initialize);
window.parent.postMessage(session, '*');
