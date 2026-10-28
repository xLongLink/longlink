// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { commandSchema, type ViewReply } from '@/views/protocol';

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
    const requested: string[] = [];
    let inFlight = 0;
    let peak = 0;

    // happy-dom clones Blobs into plain objects over MessagePort, so replies reach the runtime's handler directly.
    const reply = (data: ViewReply) =>
        channel.port1.onmessage?.call(channel.port1, new MessageEvent('message', { data }));

    // Answer each image on a later task so concurrent requests accumulate like they do against a real host.
    channel.port2.onmessage = (event: MessageEvent<unknown>) => {
        const command = commandSchema.parse(event.data);

        if (command.type === 'icon') {
            reply({ id: command.id, ok: false, error: 'No icons in this test' });

            return;
        }

        if (command.type !== 'request') return;
        requested.push(command.path);
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        setTimeout(() => {
            inFlight -= 1;
            reply({ id: command.id, ok: true, data: new Blob(['image'], { type: 'image/png' }) });
        }, 10);
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
        await vi.waitFor(() => expect(mount.querySelectorAll('img')).toHaveLength(12), { timeout: 10_000 });
        expect(mount.textContent).not.toContain('Photo unavailable');
        expect(new Set(requested).size).toBe(12);
        expect(peak).toBe(12);
    } finally {
        window.dispatchEvent(new Event('pagehide'));
        channel.port1.close();
        channel.port2.close();
        mount.remove();
    }
}, 30_000);
