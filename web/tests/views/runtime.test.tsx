// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { commandSchema, REQUEST_TIMEOUT, type ViewReply } from '@/views/protocol';

it('ignores a mismatched session and releases an admitted port when its mount is absent', async () => {
    // Arrange
    window.__VIEW_SESSION__ = 'runtime-test-session';
    const channel = new MessageChannel();
    const close = vi.spyOn(channel.port1, 'close');

    // Act
    try {
        await import('@/views/runtime');

        const proof = {
            source: 'export default function View() { return null; }',
            params: {},
            navigationBaseUrl: 'https://platform.example/',
            appearance: { theme: 'system', accent: 'neutral' },
        };

        window.dispatchEvent(
            new MessageEvent('message', {
                source: window,
                ports: [channel.port1],
                data: { ...proof, session: 'wrong-session' },
            })
        );

        // Assert
        expect(close).not.toHaveBeenCalled();
        window.dispatchEvent(
            new MessageEvent('message', {
                source: window,
                ports: [channel.port1],
                data: { ...proof, session: 'runtime-test-session' },
            })
        );
        expect(close).toHaveBeenCalledOnce();
    } finally {
        channel.port1.close();
        channel.port2.close();
        vi.restoreAllMocks();
    }
});

it('loads gallery images concurrently without a request cap', async () => {
    // Arrange
    vi.resetModules();
    window.__VIEW_SESSION__ = 'gallery-test-session';
    const mount = document.createElement('div');
    mount.id = 'view';
    document.body.append(mount);
    const channel = new MessageChannel();
    const requests: { id: number; path: string }[] = [];

    // happy-dom clones Blobs into plain objects over MessagePort, so replies reach the runtime's handler directly.
    const reply = (data: ViewReply) =>
        channel.port1.onmessage?.call(channel.port1, new MessageEvent('message', { data }));

    // Hold image responses until every request is in flight.
    channel.port2.onmessage = (event: MessageEvent<unknown>) => {
        const command = commandSchema.parse(event.data);

        if (command.type === 'icon') {
            reply({ id: command.id, ok: false, error: 'No icons in this test' });

            return;
        }

        if (command.type !== 'request') return;
        requests.push(command);
    };

    // Act
    try {
        await import('@/views/runtime');
        window.dispatchEvent(
            new MessageEvent('message', {
                source: window,
                ports: [channel.port1],
                data: {
                    session: 'gallery-test-session',
                    source: "export default function View() { return <>{Array.from({ length: 12 }, (_, index) => <Image key={index} src={'/api/photos/' + index} alt={'Photo ' + index} />)}</>; }",
                    params: {},
                    navigationBaseUrl: 'https://platform.example/',
                    appearance: { theme: 'system', accent: 'neutral' },
                },
            })
        );

        // Assert
        await vi.waitFor(() => expect(requests).toHaveLength(12), { timeout: 10_000 });
        expect(new Set(requests.map((request) => request.path)).size).toBe(12);

        // Act
        for (const request of requests) {
            reply({ id: request.id, ok: true, data: new Blob(['image'], { type: 'image/png' }) });
        }

        // Assert
        await vi.waitFor(() => expect(mount.querySelectorAll('img')).toHaveLength(12), { timeout: 10_000 });
        expect(mount.textContent).not.toContain('Photo unavailable');
    } finally {
        window.dispatchEvent(new Event('pagehide'));
        channel.port1.close();
        channel.port2.close();
        mount.remove();
    }
}, 30_000);

it('rejects an unfinished authored request with View closed on pagehide before its deadline', async () => {
    // Arrange
    vi.resetModules();
    const previousSession = window.__VIEW_SESSION__;
    const previousAccent = document.documentElement.getAttribute('data-accent');
    window.__VIEW_SESSION__ = 'pagehide-test-session';
    const mount = document.createElement('div');
    mount.id = 'view';
    document.body.append(mount);
    const channel = new MessageChannel();
    const close = vi.spyOn(channel.port1, 'close');
    const received = vi.fn();
    channel.port2.onmessage = (event: MessageEvent<unknown>) => {
        const command = commandSchema.parse(event.data);

        if (command.type === 'request') received(command);
    };

    try {
        await import('@/views/runtime');
        const started = performance.now();
        window.dispatchEvent(
            new MessageEvent('message', {
                source: window,
                ports: [channel.port1],
                data: {
                    session: 'pagehide-test-session',
                    source: `export default function View() {
                        const [caughtError, setCaughtError] = useState(null);
                        useEffect(() => {
                            request('/api/pending').then(
                                () => setCaughtError('Request completed'),
                                error => setCaughtError(error.message)
                            );
                        }, []);
                        return <p role="status">{caughtError ?? 'Request pending'}</p>;
                    }`,
                    params: {},
                    navigationBaseUrl: 'https://platform.example/',
                    appearance: { theme: 'system', accent: 'neutral' },
                },
            })
        );

        // Act
        await vi.waitFor(() =>
            expect(received).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({
                    type: 'request',
                    path: '/api/pending',
                    method: 'GET',
                })
            )
        );
        expect(mount.querySelector('[role="status"]')?.textContent).toBe('Request pending');
        expect(close).not.toHaveBeenCalled();
        window.dispatchEvent(new Event('pagehide'));

        // Assert
        expect(close).toHaveBeenCalled();
        await vi.waitFor(() => expect(mount.querySelector('[role="status"]')?.textContent).toBe('View closed'), {
            timeout: 2_000,
        });
        expect(performance.now() - started).toBeLessThan(REQUEST_TIMEOUT);
    } finally {
        window.dispatchEvent(new Event('pagehide'));
        channel.port1.close();
        channel.port2.close();
        close.mockRestore();
        mount.remove();
        window.__VIEW_SESSION__ = previousSession;

        if (previousAccent === null) document.documentElement.removeAttribute('data-accent');
        else document.documentElement.setAttribute('data-accent', previousAccent);

        vi.resetModules();
    }
}, 10_000);
