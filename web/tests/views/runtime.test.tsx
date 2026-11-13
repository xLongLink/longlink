// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { commandSchema, REQUEST_TIMEOUT, type ViewReply } from '@/views/protocol';

it('ignores a mismatched session and releases an admitted port when its mount is absent', async () => {
    // Arrange
    const previousSession = window.__VIEW_SESSION__;
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
        close.mockRestore();
        window.__VIEW_SESSION__ = previousSession;
    }
});

it('loads gallery images concurrently without a request cap', async () => {
    // Arrange
    vi.resetModules();
    const previousSession = window.__VIEW_SESSION__;
    const previousTheme = document.documentElement.getAttribute('data-theme');
    const previousAccent = document.documentElement.getAttribute('data-accent');
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
        window.__VIEW_SESSION__ = previousSession;

        for (const [name, value] of [
            ['data-theme', previousTheme],
            ['data-accent', previousAccent],
        ] as const) {
            if (value === null) document.documentElement.removeAttribute(name);
            else document.documentElement.setAttribute(name, value);
        }
    }
}, 30_000);

it('rejects an unfinished authored request with View closed on pagehide before its deadline', async () => {
    // Arrange
    vi.resetModules();
    const previousSession = window.__VIEW_SESSION__;
    const previousTheme = document.documentElement.getAttribute('data-theme');
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

        for (const [name, value] of [
            ['data-theme', previousTheme],
            ['data-accent', previousAccent],
        ] as const) {
            if (value === null) document.documentElement.removeAttribute(name);
            else document.documentElement.setAttribute(name, value);
        }

        vi.resetModules();
    }
}, 10_000);

/** Admits real authored source and restores the sandbox-owned document after each regression. */
async function initializeRuntime(source: string) {
    vi.resetModules();
    const previousSession = window.__VIEW_SESSION__;
    const previousTheme = document.documentElement.getAttribute('data-theme');
    const previousAccent = document.documentElement.getAttribute('data-accent');
    window.__VIEW_SESSION__ = 'appearance-test-session';
    const mount = document.createElement('div');
    mount.id = 'view';
    document.body.append(mount);
    const channel = new MessageChannel();
    await import('@/views/runtime');
    window.dispatchEvent(
        new MessageEvent('message', {
            source: window,
            ports: [channel.port1],
            data: {
                source,
                session: 'appearance-test-session',
                params: {},
                navigationBaseUrl: 'https://platform.example/',
                appearance: { theme: 'light', accent: 'neutral' },
            },
        })
    );

    return {
        mount,
        channel,
        send(data: ViewReply | { type: 'appearance'; appearance: { theme: string; accent: string } }) {
            channel.port1.onmessage?.call(channel.port1, new MessageEvent('message', { data }));
        },
        close() {
            window.dispatchEvent(new Event('pagehide'));
            channel.port1.close();
            channel.port2.close();
            mount.remove();
            window.__VIEW_SESSION__ = previousSession;

            for (const [name, value] of [
                ['data-theme', previousTheme],
                ['data-accent', previousAccent],
            ] as const) {
                if (value === null) document.documentElement.removeAttribute(name);
                else document.documentElement.setAttribute(name, value);
            }
        },
    };
}

it('keeps authored state and unsaved input through live appearance updates and returning to system mode', async () => {
    // A theme provider replacement must not discard View state or an uncontrolled draft.
    const runtime = await initializeRuntime(`export default function View() {
        const [count, setCount] = useState(0);
        return <><input aria-label="Draft" defaultValue="" />
            <button onClick={() => setCount(count + 1)}>Count {count}</button></>;
    }`);

    const user = userEvent.setup();

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('input')).not.toBeNull());
        const input = runtime.mount.querySelector('input');

        if (!input) throw new Error('Expected authored draft input');
        const button = runtime.mount.querySelector('button');

        if (!button) throw new Error('Expected authored counter button');
        await user.type(input, 'Unsaved note');
        await user.click(button);
        expect(button.textContent).toBe('Count 1');
        expect(document.documentElement.dataset.theme).toBe('light');

        for (const theme of ['dark', 'light', 'system']) {
            runtime.send({ type: 'appearance', appearance: { theme, accent: 'blue' } });
            expect(document.documentElement.dataset.theme).toBe(theme === 'system' ? undefined : theme);
            expect(document.documentElement.dataset.accent).toBe('blue');
            expect(runtime.mount.querySelector('input')).toBe(input);
            expect(input.value).toBe('Unsaved note');
            expect(runtime.mount.querySelector('button')).toBe(button);
            expect(button.textContent).toBe('Count 1');
        }

        runtime.send({ type: 'appearance', appearance: { theme: 'invalid', accent: 'red' } });
        expect(document.documentElement.dataset.theme).toBeUndefined();
        expect(document.documentElement.dataset.accent).toBe('blue');
        await user.click(button);
        expect(button.textContent).toBe('Count 2');
    } finally {
        runtime.close();
    }
});

it('bounds request failures and retries the failed query instead of leaving its cached error in place', async () => {
    // Retry must reset both the React boundary and the actual failed query.
    const runtime = await initializeRuntime(`export default function View() {
        const [data] = useApi('/api/recoverable');
        return <p>{data.message}</p>;
    }`);

    const failure = '<script>untrusted diagnostic</script>' + 'x'.repeat(1500);
    const requests: number[] = [];

    runtime.channel.port2.onmessage = (event: MessageEvent<unknown>) => {
        const command = commandSchema.parse(event.data);

        if (command.type !== 'request') return;
        requests.push(command.id);

        if (requests.length > 1) {
            runtime.send({ id: command.id, ok: true, data: { message: 'Recovered records' } });
        }
    };

    try {
        await vi.waitFor(() => expect(requests).toHaveLength(1));
        const progress = runtime.mount.querySelector('[role="progressbar"]');

        if (!progress) throw new Error('Expected pending View progress');
        const labelId = progress.getAttribute('aria-labelledby');

        if (!labelId) throw new Error('Expected visible loading label association');
        expect(document.getElementById(labelId)?.textContent).toBe('Loading View');
        expect(progress.closest('[role="status"]')).toBeNull();
        runtime.send({ id: requests[0], ok: false, error: failure });
        await vi.waitFor(() => expect(runtime.mount.querySelector('h2')?.textContent).toBe('View could not be loaded'));
        expect(runtime.mount.querySelector('[role="progressbar"]')).toBeNull();
        expect(runtime.mount.querySelector('[role="region"], section')?.getAttribute('aria-label')).toBe(
            'Solution View'
        );
        expect(runtime.mount.querySelector('[role="status"] p')?.textContent).toBe(failure.slice(0, 1024));
        expect(runtime.mount.querySelector('script')).toBeNull();
        const retry = runtime.mount.querySelector('button');

        if (!retry) throw new Error('Expected runtime Retry button');
        await userEvent.setup().click(retry);
        await vi.waitFor(() => expect(runtime.mount.textContent).toBe('Recovered records'));
        expect(requests).toHaveLength(2);
        expect(requests[1]).not.toBe(requests[0]);
    } finally {
        runtime.close();
    }
});

it('keeps runtime tooltip portals under the document mode scope through live changes', async () => {
    const runtime = await initializeRuntime(`export default function View() {
        return <ProgressBar label="Storage" value={25} marks={[{ value: 25, label: 'Target' }]} />;
    }`);

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('[aria-label="Target"]')).not.toBeNull());
        const mark = runtime.mount.querySelector<HTMLElement>('[aria-label="Target"]');

        if (!mark) throw new Error('Expected runtime target');
        await userEvent.setup().tab();
        await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Target'));
        const tooltip = document.querySelector('[role="tooltip"]');

        expect(tooltip?.closest('[data-theme-scope="stone"]')).toBe(document.documentElement);
        expect(runtime.mount.contains(tooltip)).toBe(false);
        runtime.send({ type: 'appearance', appearance: { theme: 'dark', accent: 'blue' } });
        expect(document.documentElement.dataset.theme).toBe('dark');
        expect(document.querySelector('[role="tooltip"]')).toBe(tooltip);
        expect(tooltip?.closest('[data-theme-scope="stone"]')).toBe(document.documentElement);
        await userEvent.setup().keyboard('{Escape}');
        await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull());
    } finally {
        runtime.close();
    }
});

it('keeps evaluation diagnostics bounded and inert in the same Solution View region', async () => {
    const failure = '<img src=x onerror=alert(1)>' + 'y'.repeat(1500);
    const runtime = await initializeRuntime(`throw new Error(${JSON.stringify(failure)});`);

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('h2')?.textContent).toBe('View compilation failed'));
        expect(runtime.mount.querySelector('section')?.getAttribute('aria-label')).toBe('Solution View');
        expect(runtime.mount.querySelector('[role="status"] p')?.textContent).toBe(failure.slice(0, 1024));
        expect(runtime.mount.querySelector('img')).toBeNull();
        expect(runtime.mount.querySelector('button')).toBeNull();
    } finally {
        runtime.close();
    }
});
