import { z } from 'zod';
import * as React from 'react';
import { transform } from 'sucrase';
import { stoneTheme } from '@/theme';
import * as components from './components';
import { createRoot } from 'react-dom/client';
import { Theme } from '@astryxdesign/core/theme';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    commandSchema,
    messageSize,
    MAX_MESSAGE_SIZE,
    MAX_PENDING_REQUESTS,
    REQUEST_TIMEOUT,
    type RequestCommand,
    type ViewReply,
} from './protocol';
import './theme.css';

declare global {
    interface Window {
        __VIEW_SESSION__: string;
    }
}

const session = window.__VIEW_SESSION__;
const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
>();
let sequence = 0;
let port: MessagePort;

/** Requests one Solution API operation without exposing any browser credentials to the View. */
async function request(
    path: string,
    options: Omit<RequestCommand, 'type' | 'id' | 'path' | 'method'> & { method?: RequestCommand['method'] } = {}
): Promise<unknown> {
    const id = sequence++;
    const command = commandSchema.parse({ ...options, type: 'request', id, path, method: options.method ?? 'GET' });
    if (command.type !== 'request' || messageSize(command) > MAX_MESSAGE_SIZE)
        throw new Error('Solution request is too large');
    if (pending.size >= MAX_PENDING_REQUESTS) throw new Error('Too many pending requests');
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error('Solution request timed out'));
        }, REQUEST_TIMEOUT);
        pending.set(id, { resolve, reject, timer });
        port.postMessage(command);
    });
}

/** Requests navigation inside the host's Solution route prefix. */
function navigate(path: string): void {
    port.postMessage({ type: 'navigate', path });
}

/** Limits navigation to a host capability rather than granting top-level browser access. */
function Link({ to, children }: { to: string; children: React.ReactNode }) {
    return (
        <components.Button label="" variant="ghost" clickAction={() => navigate(to)}>
            {children}
        </components.Button>
    );
}

/** Formats numeric currency values using the browser's standard internationalization support. */
function Currency({ value, currency, locale }: { value: number; currency: string; locale?: string }) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

/** Presents the same lifecycle states without requiring the XML adapter registry. */
function StatusBadge({ status }: { status: 'running' | 'creating' | 'failed' }) {
    return status === 'running' ? null : (
        <components.Badge
            label={status === 'creating' ? 'Creating' : 'Failed'}
            variant={status === 'creating' ? 'info' : 'error'}
        />
    );
}

/** Loads image attachments through the scoped bridge only after a user requests their preview. */
function FileViewer({ src, title }: { src: string; title: string }) {
    const [open, setOpen] = React.useState(false);
    const [url, setUrl] = React.useState<string>();
    const [failed, setFailed] = React.useState(false);

    // Own every blob URL and reject unsupported media rather than loading a privileged document frame.
    React.useEffect(() => {
        if (!open) return;
        let active = true;
        let objectUrl: string | undefined;
        void request(src, { binary: true })
            .then((value) => {
                if (!active) return;
                if (!(value instanceof Blob) || !value.type.startsWith('image/')) {
                    setFailed(true);
                    return;
                }
                objectUrl = URL.createObjectURL(value);
                setUrl(objectUrl);
            })
            .catch(() => {
                if (active) setFailed(true);
            });
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [open, src]);

    return (
        <components.Stack gap={2}>
            <components.Button variant="ghost" label={title} clickAction={() => setOpen(!open)} />
            {open &&
                (failed ? (
                    <components.Text>Preview unavailable for this file type.</components.Text>
                ) : url ? (
                    <img src={url} alt={title} className="max-h-full max-w-full rounded-lg object-contain" />
                ) : (
                    <components.Spinner label="Loading attachment" />
                ))}
        </components.Stack>
    );
}

/** Contains render failures without exposing host data or internals. */
class ViewBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        return this.state.failed ? (
            <components.Banner status="error" title="View rendering failed" />
        ) : (
            this.props.children
        );
    }
}

const initialization = z
    .object({ session: z.string(), source: z.string(), params: z.record(z.string(), z.string()) })
    .strict();

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
        else waiter.reject(new Error(reply.data.error));
    };
    const mount = document.getElementById('view');
    if (!mount) return;
    const root = createRoot(mount);

    // Measure the content root, not the viewport, so shorter Views can shrink again.
    let height = 0;
    const observer = new ResizeObserver(() => {
        const nextHeight = Math.min(100_000, Math.max(1, Math.ceil(mount.getBoundingClientRect().height)));
        if (nextHeight === height) return;
        height = nextHeight;
        port.postMessage({ type: 'resize', height });
    });
    observer.observe(mount);
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });

    // Compilation and evaluation happen only in the sandbox, never in the Platform module graph.
    try {
        const code = transform(parsed.data.source, {
            transforms: ['jsx', 'imports'],
            jsxRuntime: 'classic',
            production: true,
        }).code;
        const bindings = {
            React,
            ...components,
            Link,
            Currency,
            FileViewer,
            StatusBadge,
            request,
            navigate,
            useQuery,
            useQueryClient,
            params: parsed.data.params,
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
        const View = result as React.ComponentType;
        const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        root.render(
            <Theme theme={stoneTheme} mode="dark">
                <LayerProvider toast={{ position: 'bottomEnd' }}>
                    <QueryClientProvider client={client}>
                        <ViewBoundary>
                            <View />
                        </ViewBoundary>
                    </QueryClientProvider>
                </LayerProvider>
            </Theme>
        );
    } catch {
        root.render(<p>View compilation failed. Export a default JSX component without package imports.</p>);
    }
}

// A fresh opaque-origin frame cannot read parent state, storage, or cookies.
window.addEventListener('message', initialize);
window.parent.postMessage(session, '*');
window.addEventListener(
    'pagehide',
    () => {
        for (const waiter of pending.values()) {
            clearTimeout(waiter.timer);
            waiter.reject(new Error('View closed'));
        }
        pending.clear();
        port?.close();
    },
    { once: true }
);
