// @vitest-environment happy-dom
import { act } from 'react';
import * as host from '@/views/host';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { useLocation } from 'react-router';
import { ApiErrorContext } from '@/lib/errors';
import * as workers from 'node:worker_threads';
import { JsxView } from '@/views/host/jsx-view';

it.each([
    { chunked: false, failTransfer: false, role: undefined },
    { chunked: true, failTransfer: false, role: 'reviewer' },
    { chunked: false, failTransfer: true, role: 'write' },
    { chunked: true, failTransfer: true, role: undefined }
])(
    'revokes allocated capabilities for chunked=$chunked, failed transfer=$failTransfer',
    async ({ chunked, failTransfer, role }) => {
        // Arrange
        const script = '/* Capability lifecycle bootstrap */';
        const modules = chunked ? { 'entry.js': 'a'.repeat(64) } : undefined;
        const version = 'a'.repeat(64);
        const NativeMessageChannel = globalThis.MessageChannel;
        const channels: MessageChannel[] = [];
        const closed: ReturnType<typeof vi.spyOn>[] = [];
        const messageChannel = vi.spyOn(globalThis, 'MessageChannel').mockImplementation(
            class extends NativeMessageChannel {
                constructor() {
                    super();
                    channels.push(this);
                    closed.push(vi.spyOn(this.port1, 'close'), vi.spyOn(this.port2, 'close'));
                }
            }
        );

        try {
            await withMounted(
                <ApiErrorContext value={() => undefined}>
                    <JsxView
                        source=""
                        role={role}
                        params={{}}
                        requestBaseUrl="/proxy/"
                        navigationBaseUrl="/"
                        runtime={{ version, modules }}
                        kernel={{ script, styles: '' }}
                    />
                </ApiErrorContext>,
                async (mounted) => {
                    await vi.waitFor(async () => {
                        await act(async () => {});
                        expect(mounted.querySelector('iframe')).not.toBeNull();
                    });
                    const frame = mounted.querySelector('iframe');
                    const contentWindow = frame?.contentWindow;

                    if (!frame || !contentWindow) throw new Error('Expected prepared sandbox');
                    const session = /__VIEW_SESSION__=("[^"]+");/.exec(frame.srcdoc)?.[1];

                    if (!session) throw new Error('Expected bootstrap session');
                    const transfer = vi.spyOn(contentWindow, 'postMessage').mockImplementation(() => {
                        if (failTransfer) throw new Error('Capability transfer failed');
                    });

                    try {
                        // Act
                        await act(async () => {
                            window.dispatchEvent(
                                new MessageEvent('message', {
                                    source: contentWindow,
                                    origin: 'null',
                                    data: JSON.parse(session) as unknown
                                })
                            );
                        });

                        // Assert
                        expect(channels).toHaveLength(chunked ? 2 : 1);
                        const calls: readonly (readonly unknown[])[] = transfer.mock.calls;
                        expect(calls[0]?.[2]).toEqual(channels.map((channel) => channel.port2));
                        if (role === undefined) expect(calls[0]?.[0]).not.toHaveProperty('role');
                        else expect(calls[0]?.[0]).toHaveProperty('role', role);

                        if (failTransfer) {
                            expect(mounted.querySelector('iframe')).toBeNull();
                            expect(mounted.textContent).toContain('Unable to load this View');
                            for (const close of closed) expect(close).toHaveBeenCalled();
                        } else {
                            for (const close of closed) expect(close).not.toHaveBeenCalled();
                        }
                    } finally {
                        transfer.mockRestore();
                    }
                }
            );

            for (const close of closed) expect(close).toHaveBeenCalled();
        } finally {
            messageChannel.mockRestore();
            for (const close of closed) close.mockRestore();
        }
    }
);

it('keeps execution isolated and transfers only verified Solution modules', async () => {
    // Exercise the real handshake and integrity checks, replacing only the HTTP transport.
    const script = '/* Solution bootstrap */';
    const styles = '';
    const module = 'export const value = "Solution-owned";';
    const digest = createHash('sha256').update(module).digest('hex');
    const modules = { 'entry.js': digest, 'stale.js': digest };
    const version = 'a'.repeat(64);
    const fetched: string[] = [];
    const load = vi.spyOn(host, 'load').mockImplementation(async (url) => {
        fetched.push(new URL(url).pathname);

        if (url.includes('/views/entry.js?')) return new Response(module);
        if (url.includes('/views/stale.js?')) return new Response('export const value = "wrong deployment";');
        throw new Error('Unexpected asset request');
    });

    try {
        await withMounted(
            <ApiErrorContext value={() => undefined}>
                <JsxView
                    source="private source"
                    params={{}}
                    requestBaseUrl="/proxy/"
                    navigationBaseUrl="/"
                    runtime={{ version, modules }}
                    kernel={{ script, styles }}
                />
            </ApiErrorContext>,
            async (mounted) => {
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(mounted.querySelector('iframe')).not.toBeNull();
                });
                const frame = mounted.querySelector('iframe');
                const contentWindow = frame?.contentWindow;

                if (!frame || !contentWindow) throw new Error('Expected prepared sandbox');
                const session = /__VIEW_SESSION__=("[^"]+");/.exec(frame.srcdoc)?.[1];

                if (!session) throw new Error('Expected bootstrap session');
                const transfer = vi.spyOn(contentWindow, 'postMessage').mockImplementation(() => {});

                try {
                    const token: unknown = JSON.parse(session);

                    await act(async () => {
                        window.dispatchEvent(
                            new MessageEvent('message', { source: contentWindow, origin: 'null', data: token })
                        );
                    });
                    const calls: readonly (readonly unknown[])[] = transfer.mock.calls;
                    const ports = calls[0]?.[2];
                    if (!Array.isArray(ports) || !(ports[1] instanceof workers.MessagePort)) {
                        throw new Error('Expected isolated module transport');
                    }

                    const assets = ports[1];
                    expect(frame.sandbox.toString()).not.toContain('allow-same-origin');
                    expect(frame.srcdoc).toContain(
                        'connect-src data: https://basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com;'
                    );
                    expect(frame.srcdoc).toContain('worker-src data:;');
                    expect(frame.srcdoc).toContain('media-src blob:;');
                    expect(frame.srcdoc).toContain("frame-src 'none';");
                    expect(frame.srcdoc).not.toContain('https://unpkg.com');
                    expect(frame.srcdoc).not.toContain('private source');
                    expect(fetched).toEqual([]);

                    for (const [id, path, expected] of [
                        [0, 'entry.js', { id: 0, source: module }],
                        [1, 'stale.js', { id: 1, error: 'Solution module unavailable' }],
                        [2, '../another-solution/entry.js', { id: 2, error: 'Solution module unavailable' }]
                    ] as const) {
                        const reply = new Promise<unknown>((resolve) => {
                            assets.once('message', resolve);
                        });
                        assets.postMessage({ id, path });
                        await expect(reply).resolves.toEqual(expected);
                    }

                    expect(fetched).toEqual(['/proxy/views/entry.js', '/proxy/views/stale.js']);

                    const commands: unknown = ports[0];
                    if (!(commands instanceof workers.MessagePort)) throw new Error('Expected command transport');
                    const activation = Object.getOwnPropertyDescriptor(navigator, 'userActivation');
                    let isActive = false;
                    Object.defineProperty(navigator, 'userActivation', {
                        configurable: true,
                        value: {
                            get isActive() {
                                return isActive;
                            }
                        }
                    });
                    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
                    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
                        const request = input instanceof Request ? input : new Request(input);
                        if (new URL(request.url).pathname !== '/proxy/navigation-check') {
                            throw new Error(`Unexpected request: ${request.url}`);
                        }
                        return new Response(null, { status: 204 });
                    });

                    try {
                        // A following request acknowledges that the preceding navigation commands were processed.
                        const inactiveReply = new Promise<unknown>((resolve) => commands.once('message', resolve));
                        await act(async () => {
                            commands.postMessage({ type: 'navigate', path: 'https://docs.example/inactive' });
                            commands.postMessage({ type: 'request', id: 10, path: 'navigation-check', method: 'GET' });
                            await expect(inactiveReply).resolves.toEqual({ id: 10, ok: true, data: null });
                        });
                        expect(open).not.toHaveBeenCalled();

                        isActive = true;
                        const activeReply = new Promise<unknown>((resolve) => commands.once('message', resolve));
                        await act(async () => {
                            for (const path of [
                                'javascript:alert(1)',
                                'data:text/html,unsafe',
                                'https://user:password@example.com/private',
                                '//user@example.com/private',
                                '//[',
                                '//docs.example/help'
                            ]) {
                                commands.postMessage({ type: 'navigate', path });
                            }
                            commands.postMessage({ type: 'request', id: 11, path: 'navigation-check', method: 'GET' });
                            await expect(activeReply).resolves.toEqual({ id: 11, ok: true, data: null });
                        });
                        expect(open).toHaveBeenCalledExactlyOnceWith(
                            `${window.location.protocol}//docs.example/help`,
                            '_blank',
                            'noopener,noreferrer'
                        );
                    } finally {
                        open.mockRestore();
                        fetch.mockRestore();
                        if (activation) Object.defineProperty(navigator, 'userActivation', activation);
                        else Reflect.deleteProperty(navigator, 'userActivation');
                    }
                } finally {
                    transfer.mockRestore();
                }
            }
        );
    } finally {
        load.mockRestore();
    }
});

it('accepts v0.9.6 navigation commands with newTab:false and navigates within the Solution', async () => {
    // Arrange
    const script = '/* v0.9.6 navigation bootstrap */';
    const version = 'a'.repeat(64);

    function Location() {
        return <output>{useLocation().pathname}</output>;
    }

    await withMounted(
        <ApiErrorContext value={() => undefined}>
            <JsxView
                source=""
                params={{}}
                requestBaseUrl="/proxy/"
                navigationBaseUrl="/solutions/orders/"
                runtime={{ version }}
                kernel={{ script, styles: '' }}
            />
            <Location />
        </ApiErrorContext>,
        async (mounted) => {
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(mounted.querySelector('iframe')).not.toBeNull();
            });
            const frame = mounted.querySelector('iframe');
            const contentWindow = frame?.contentWindow;

            if (!frame || !contentWindow) throw new Error('Expected prepared sandbox');
            const session = /__VIEW_SESSION__=("[^"]+");/.exec(frame.srcdoc)?.[1];

            if (!session) throw new Error('Expected bootstrap session');
            const transfer = vi.spyOn(contentWindow, 'postMessage').mockImplementation(() => {});

            try {
                await act(async () => {
                    window.dispatchEvent(
                        new MessageEvent('message', {
                            source: contentWindow,
                            origin: 'null',
                            data: JSON.parse(session) as unknown
                        })
                    );
                });
                const calls: readonly (readonly unknown[])[] = transfer.mock.calls;
                const ports = calls[0]?.[2];
                if (!Array.isArray(ports) || !(ports[0] instanceof workers.MessagePort)) {
                    throw new Error('Expected command transport');
                }

                // Act
                ports[0].postMessage({ type: 'navigate', path: '/invoices', newTab: false });

                // Assert
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(mounted.querySelector('output')?.textContent).toBe('/solutions/orders/invoices');
                });
            } finally {
                transfer.mockRestore();
            }
        }
    );
});

it('returns binary file replies without opening a host preview', async () => {
    // Arrange
    const script = '/* Preview bootstrap */';
    const version = 'a'.repeat(64);
    const text = '<script>window.previewExecuted = true</script><img src=x onerror="alert(1)">';
    const postMessage = vi.spyOn(workers.MessagePort.prototype, 'postMessage');
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const path = new URL(input instanceof Request ? input.url : String(input)).pathname;

        if (path === '/proxy/report') {
            return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0xff]), {
                headers: { 'Content-Type': 'application/pdf' }
            });
        }
        if (path === '/proxy/source') return new Response(text, { headers: { 'Content-Type': 'text/html' } });
        throw new Error(`Unexpected request: ${path}`);
    });
    const reportError = vi.fn();

    try {
        await withMounted(
            <ApiErrorContext value={reportError}>
                <JsxView
                    source=""
                    params={{}}
                    requestBaseUrl="/proxy/"
                    navigationBaseUrl="/"
                    runtime={{ version }}
                    kernel={{ script, styles: '' }}
                />
            </ApiErrorContext>,
            async (mounted) => {
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(mounted.querySelector('iframe')).not.toBeNull();
                });
                const frame = mounted.querySelector('iframe');
                const contentWindow = frame?.contentWindow;

                if (!frame || !contentWindow) throw new Error('Expected prepared sandbox');
                const session = /__VIEW_SESSION__=("[^"]+");/.exec(frame.srcdoc)?.[1];

                if (!session) throw new Error('Expected bootstrap session');
                const transfer = vi.spyOn(contentWindow, 'postMessage').mockImplementation(() => {});

                try {
                    await act(async () => {
                        window.dispatchEvent(
                            new MessageEvent('message', {
                                source: contentWindow,
                                origin: 'null',
                                data: JSON.parse(session) as unknown
                            })
                        );
                    });
                    const calls: readonly (readonly unknown[])[] = transfer.mock.calls;
                    const ports = calls[0]?.[2];

                    if (!Array.isArray(ports) || !(ports[0] instanceof workers.MessagePort)) {
                        throw new Error('Expected isolated preview transport');
                    }
                    const commands = ports[0];

                    // Act
                    const pdfReply = new Promise<void>((resolve) => commands.once('message', () => resolve()));

                    await act(async () => {
                        commands.postMessage({ id: 0, type: 'request', path: 'report', method: 'GET', binary: true });
                        await pdfReply;
                    });
                    // Assert
                    const pdf: unknown = postMessage.mock.lastCall?.[0];

                    if (!pdf || typeof pdf !== 'object' || !('data' in pdf) || !(pdf.data instanceof Blob)) {
                        throw new Error('Expected PDF Blob reply');
                    }
                    expect(postMessage).toHaveBeenLastCalledWith({ id: 0, ok: true, data: pdf.data });
                    expect(pdf.data.type).toBe('application/pdf');
                    expect(new Uint8Array(await pdf.data.arrayBuffer())).toEqual(
                        new Uint8Array([0x25, 0x50, 0x44, 0x46, 0xff])
                    );
                    expect(document.querySelector('[role="dialog"]')).toBeNull();

                    const textReply = new Promise<void>((resolve) => commands.once('message', () => resolve()));

                    await act(async () => {
                        commands.postMessage({ id: 1, type: 'request', path: 'source', method: 'GET', binary: true });
                        await textReply;
                    });
                    const source: unknown = postMessage.mock.lastCall?.[0];

                    if (
                        !source ||
                        typeof source !== 'object' ||
                        !('data' in source) ||
                        !(source.data instanceof Blob)
                    ) {
                        throw new Error('Expected HTML Blob reply');
                    }
                    expect(postMessage).toHaveBeenLastCalledWith({ id: 1, ok: true, data: source.data });
                    expect(source.data.type).toBe('text/html');
                    expect(await source.data.text()).toBe(text);
                    expect(document.querySelector('[role="dialog"]')).toBeNull();
                    expect(reportError).not.toHaveBeenCalled();
                } finally {
                    transfer.mockRestore();
                }
            }
        );
    } finally {
        fetch.mockRestore();
        postMessage.mockRestore();
    }
});
