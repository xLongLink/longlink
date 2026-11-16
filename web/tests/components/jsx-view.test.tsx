// @vitest-environment happy-dom
import { act } from 'react';
import * as host from '@/views/host';
import { it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { ApiErrorContext } from '@/lib/errors';
import * as workers from 'node:worker_threads';
import { JsxView } from '@/components/jsx-view';
import { renderStatic, withMounted } from '../render';

it('keeps execution isolated and transfers only verified Solution modules', async () => {
    // Act
    const output = renderStatic(
        <ApiErrorContext value={() => undefined}>
            <JsxView
                source="private source"
                params={{}}
                requestBaseUrl="/proxy/"
                navigationBaseUrl="/"
                runtime={{ version: 'a'.repeat(64) }}
            />
        </ApiErrorContext>
    );

    // Assert
    expect(output.querySelector('iframe')).toBeNull();
    expect(output.textContent).not.toContain('private source');
    expect(output.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Preparing View');

    // Exercise the real handshake and integrity checks, replacing only the HTTP transport.
    const script = '/* Solution bootstrap */';
    const styles = '';
    const module = 'export const value = "Solution-owned";';
    const digest = createHash('sha256').update(module).digest('hex');
    const modules = { 'entry.js': digest, 'stale.js': digest };
    const version = createHash('sha256')
        .update(`${script}\n${styles}\n${JSON.stringify(modules)}`)
        .digest('hex');
    const fetched: string[] = [];
    const load = vi.spyOn(host, 'load').mockImplementation(async (url) => {
        fetched.push(new URL(url).pathname);

        if (url.includes('/views/runtime.js?')) return new Blob([script]);
        if (url.includes('/views/runtime.css?')) return new Blob([styles]);
        if (url.includes('/views/entry.js?')) return new Blob([module]);
        if (url.includes('/views/stale.js?')) return new Blob(['export const value = "wrong deployment";']);
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
                    expect(fetched).toEqual(['/proxy/views/runtime.js', '/proxy/views/runtime.css']);

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

                    expect(fetched).toEqual([
                        '/proxy/views/runtime.js',
                        '/proxy/views/runtime.css',
                        '/proxy/views/entry.js',
                        '/proxy/views/stale.js'
                    ]);
                } finally {
                    transfer.mockRestore();
                }
            }
        );
    } finally {
        load.mockRestore();
    }
});
