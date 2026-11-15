// @vitest-environment happy-dom
import { it, expect, vi, beforeAll } from 'vitest';
import userEvent from '@testing-library/user-event';
import { commandSchema, REQUEST_TIMEOUT, type ViewReply } from '@/views/protocol';

// Finish cold module loading before any test can replace the session or reset the module cache.
beforeAll(async () => {
    const previousSession = window.__VIEW_SESSION__;
    window.__VIEW_SESSION__ = 'runtime-test-session';

    try {
        await import('@/views/runtime');
    } finally {
        window.__VIEW_SESSION__ = previousSession;
    }
}, 30_000);

it('ignores a mismatched session and releases an admitted port when its mount is absent', async () => {
    // Arrange
    const previousSession = window.__VIEW_SESSION__;
    window.__VIEW_SESSION__ = 'runtime-test-session';
    const channel = new MessageChannel();
    const close = vi.spyOn(channel.port1, 'close');

    // Act
    try {
        const proof = {
            source: 'export default function View() { return null; }',
            params: {},
            navigationBaseUrl: 'https://platform.example/',
            appearance: { theme: 'system', accent: 'neutral' }
        };

        window.dispatchEvent(
            new MessageEvent('message', {
                source: window,
                ports: [channel.port1],
                data: { ...proof, session: 'wrong-session' }
            })
        );

        // Assert
        expect(close).not.toHaveBeenCalled();
        window.dispatchEvent(
            new MessageEvent('message', {
                source: window,
                ports: [channel.port1],
                data: { ...proof, session: 'runtime-test-session' }
            })
        );
        expect(close).toHaveBeenCalledOnce();
    } finally {
        channel.port1.close();
        channel.port2.close();
        close.mockRestore();
        window.__VIEW_SESSION__ = previousSession;
    }
}, 30_000);

it('loads gallery images concurrently with Solution-owned icons', async () => {
    // Arrange
    const runtime = await initializeRuntime(
        'export default function View() { return <><Icon icon="search" size="sm" />{Array.from({ length: 12 }, (_, index) => <Image key={index} src={\'/api/photos/\' + index} alt={\'Photo \' + index} />)}</>; }'
    );

    const requests: { id: number; path: string }[] = [];
    const hostIcons: unknown[] = [];

    // Hold image responses until every request is in flight.
    runtime.channel.port2.onmessage = (event: MessageEvent<unknown>) => {
        const command = commandSchema.parse(event.data);

        if (command.type === 'icon') {
            hostIcons.push(command);
            runtime.send({ id: command.id, ok: false, error: 'No icons in this test' });

            return;
        }

        if (command.type !== 'request') return;
        requests.push(command);
    };

    try {
        // Assert
        await vi.waitFor(() => expect(requests).toHaveLength(12), { timeout: 10_000 });
        expect(new Set(requests.map((request) => request.path)).size).toBe(12);

        // Act
        for (const request of requests) {
            runtime.send({ id: request.id, ok: true, data: new Blob(['image'], { type: 'image/png' }) });
        }

        // Assert
        await vi.waitFor(() => expect(runtime.mount.querySelectorAll('img')).toHaveLength(12), { timeout: 10_000 });
        await vi.waitFor(() => expect(runtime.mount.querySelector('svg.lucide-search circle')).not.toBeNull());
        expect(hostIcons).toEqual([]);
        expect(runtime.mount.textContent).not.toContain('Photo unavailable');
    } finally {
        runtime.close();
    }
}, 30_000);

it('rejects an unfinished authored request with View closed on pagehide before its deadline', async () => {
    // Arrange
    const started = performance.now();

    const runtime = await initializeRuntime(`export default function View() {
        useEffect(() => {
            request('/api/pending').then(
                () => window.dispatchEvent(new CustomEvent('pending-request-settled', { detail: 'Request completed' })),
                error => window.dispatchEvent(new CustomEvent('pending-request-settled', { detail: error.message }))
            );
        }, []);
        return <p role="status">Request pending</p>;
    }`);

    const close = vi.spyOn(runtime.channel.port1, 'close');
    const received = vi.fn();
    const settled = vi.fn();
    window.addEventListener('pending-request-settled', settled);
    runtime.channel.port2.onmessage = (event: MessageEvent<unknown>) => {
        const command = commandSchema.parse(event.data);

        if (command.type === 'request') received(command);
    };

    try {
        // Act
        await vi.waitFor(() =>
            expect(received).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({ type: 'request', path: '/api/pending', method: 'GET' })
            )
        );
        expect(runtime.mount.querySelector('[role="status"]')?.textContent).toBe('Request pending');
        expect(settled).not.toHaveBeenCalled();
        expect(close).not.toHaveBeenCalled();
        window.dispatchEvent(new Event('pagehide'));

        // Assert
        expect(close).toHaveBeenCalled();
        await vi.waitFor(
            () => expect(settled).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ detail: 'View closed' })),
            { timeout: 2_000 }
        );
        expect(performance.now() - started).toBeLessThan(REQUEST_TIMEOUT);
    } finally {
        runtime.close();
        close.mockRestore();
        window.removeEventListener('pending-request-settled', settled);
    }
}, 10_000);

it('cleans authored effects and releases the host file slot before closing the port on pagehide', async () => {
    // Observe real unmount cleanup without keeping the authored tree alive.
    const cleaned = vi.fn();
    window.addEventListener('authored-cleanup', cleaned);
    const frames = vi.spyOn(globalThis, 'requestAnimationFrame');
    const cancelFrame = vi.spyOn(globalThis, 'cancelAnimationFrame');

    const runtime = await initializeRuntime(`export default function View() {
        useEffect(() => () => window.dispatchEvent(new Event('authored-cleanup')), []);
        return <FileViewer src="/api/report" title="Report" />;
    }`);

    const post = vi.spyOn(runtime.channel.port1, 'postMessage');
    const close = vi.spyOn(runtime.channel.port1, 'close');

    try {
        await vi.waitFor(() =>
            expect(
                post.mock.calls.some(
                    ([command]) =>
                        command.type === 'file-viewer' && command.path === '/api/report' && command.bounds !== null
                )
            ).toBe(true)
        );
        const animation: unknown = frames.mock.results.at(-1)?.value;
        expect(animation).toBeDefined();
        expect(cleaned).not.toHaveBeenCalled();
        window.dispatchEvent(new Event('pagehide'));

        // A closed port must not strand host UI or its measuring loop.
        expect(cleaned).toHaveBeenCalledOnce();
        expect(cancelFrame).toHaveBeenCalledWith(animation);

        const release = post.mock.calls.findIndex(
            ([command]) => command.type === 'file-viewer' && command.path === '/api/report' && command.bounds === null
        );

        expect(release).toBeGreaterThanOrEqual(0);
        expect(post.mock.invocationCallOrder[release]).toBeLessThan(close.mock.invocationCallOrder[0]);
    } finally {
        runtime.close();
        post.mockRestore();
        close.mockRestore();
        frames.mockRestore();
        cancelFrame.mockRestore();
        window.removeEventListener('authored-cleanup', cleaned);
    }
});

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
                appearance: { theme: 'light', accent: 'neutral' }
            }
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
                ['data-accent', previousAccent]
            ] as const) {
                if (value === null) document.documentElement.removeAttribute(name);
                else document.documentElement.setAttribute(name, value);
            }
        }
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
        const progress = runtime.mount.querySelector('[data-slot="spinner"]');

        if (!progress) throw new Error('Expected pending View progress');
        expect(progress.getAttribute('aria-label')).toBe('Loading View');
        runtime.send({ id: requests[0], ok: false, error: failure });
        await vi.waitFor(() => expect(runtime.mount.querySelector('h2')?.textContent).toBe('View could not be loaded'));
        expect(runtime.mount.querySelector('[data-slot="spinner"]')).toBeNull();
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

it('ignores authored styling overrides while preserving composed controls and form updates', async () => {
    const runtime = await initializeRuntime(`export default function View() {
        const [name, setName] = useState('Draft');
        const [saved, setSaved] = useState('');
        const overrides = { className: 'authored-override', style: { color: 'red', padding: 100 } };
        return <Card {...overrides}>
            <CardContent {...overrides}>
                <Input {...overrides} id="order-name" aria-label="Order name"
                    value={name} onChange={(event) => setName(event.target.value)} />
                <Button {...overrides} variant="outline" size="sm" onClick={() => setSaved(name)}>
                    Save order
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button {...overrides} variant="outline" />}>
                        Actions
                    </DropdownMenuTrigger>
                    <DropdownMenuContent {...overrides}>
                        <DropdownMenuItem onClick={() => setSaved('Archived')}>Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <output>{saved}</output>
            </CardContent>
        </Card>;
    }`);

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('#order-name')).not.toBeNull());
        const input = runtime.mount.querySelector<HTMLInputElement>('#order-name');

        const save = Array.from(runtime.mount.querySelectorAll('button')).find(
            (button) => button.textContent === 'Save order'
        );

        const actions = runtime.mount.querySelector<HTMLButtonElement>('[data-slot="dropdown-menu-trigger"]');

        if (!input || !save || !actions) throw new Error('Expected editable order controls');
        expect(runtime.mount.querySelector('.authored-override')).toBeNull();
        expect(runtime.mount.querySelector('[style*="red"]')).toBeNull();
        expect(input.className).not.toBe('');
        expect(save.className).not.toBe('');

        const user = userEvent.setup();
        await user.clear(input);
        await user.type(input, 'Purchase order');
        await user.click(save);
        await vi.waitFor(() => expect(runtime.mount.querySelector('output')?.textContent).toBe('Purchase order'));
        await user.click(actions);
        await vi.waitFor(() => expect(document.querySelector('[role="menuitem"]')).not.toBeNull());
        const archive = document.querySelector<HTMLElement>('[role="menuitem"]');

        if (!archive) throw new Error('Expected archive action');
        expect(document.querySelector('.authored-override')).toBeNull();
        expect(archive.closest('[role="menu"]')?.getAttribute('style')).not.toContain('red');
        await user.click(archive);
        await vi.waitFor(() => expect(runtime.mount.querySelector('output')?.textContent).toBe('Archived'));
    } finally {
        runtime.close();
    }
});

it('ignores grid slot and column styling without losing native sorting or mutating column definitions', async () => {
    const runtime = await initializeRuntime(`export default function View() {
        const [selected, setSelected] = useState('');
        const columns = useMemo(() => [{
            header: 'Orders',
            meta: { headerClassName: 'authored-group' },
            columns: [{
                accessorKey: 'name',
                header: ({ column }) => <DataGridColumnHeader column={column} title="Order" className="authored-header" />,
                meta: { headerClassName: 'authored-column', cellClassName: 'authored-cell' }
            }]
        }], []);
        const table = useTable({
            features: dataGridFeatures,
            data: [{ name: 'Zebra' }, { name: 'Alpha' }],
            columns,
            defaultColumn: { meta: { cellClassName: 'authored-default' } }
        });
        return <>
            <DataGrid table={table} recordCount={2} className="authored-root"
                tableClassNames={{ body: 'authored-body', bodyRow: 'authored-row' }}
                onRowClick={(row) => setSelected(row.name)}>
                <DataGridContainer className="authored-container">
                    <DataGridTable />
                </DataGridContainer>
            </DataGrid>
            <output>{selected}</output>
            <output data-original>{columns[0].columns[0].meta.cellClassName}</output>
        </>;
    }`);

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('tbody tr')?.textContent).toBe('Zebra'));
        expect(runtime.mount.querySelector('[class*="authored-"]')).toBeNull();
        const sort = runtime.mount.querySelector<HTMLButtonElement>('thead button');

        if (!sort) throw new Error('Expected order sorting control');
        const user = userEvent.setup();
        await user.click(sort);
        await vi.waitFor(() => expect(runtime.mount.querySelector('tbody tr')?.textContent).toBe('Alpha'));
        const first = runtime.mount.querySelector<HTMLElement>('tbody tr');

        if (!first) throw new Error('Expected sorted order');
        await user.click(first);
        await vi.waitFor(() => expect(runtime.mount.querySelector('output')?.textContent).toBe('Alpha'));
        expect(runtime.mount.querySelector('[class*="authored-"]')).toBeNull();
        expect(runtime.mount.querySelector('[data-original]')?.textContent).toBe('authored-cell');
    } finally {
        runtime.close();
    }
});

it('returns native Calendar ranges to authored state without selecting disabled dates', async () => {
    // Preserve range selection and native Date callbacks.
    const runtime = await initializeRuntime(`export default function View() {
        const [range, setRange] = useState(undefined);
        return <>
            <Calendar mode="range" defaultMonth={new Date(2026, 0, 1)}
                classNames={{ root: 'authored-calendar' }}
                styles={{ root: { color: 'red' } }}
                modifiersClassNames={{ selected: 'authored-selected' }}
                modifiersStyles={{ selected: { background: 'red' } }}
                components={{ DayButton: () => <button>Replacement day</button> }}
                selected={range} onSelect={setRange} disabled={new Date(2026, 0, 12)} />
            <output>{range?.from?.getDate() ?? '-'}:{range?.to?.getDate() ?? '-'}</output>
        </>;
    }`);

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('[data-slot="calendar"]')).not.toBeNull());
        const start = runtime.mount.querySelector<HTMLButtonElement>('button[aria-label*="January 10th"]');

        if (!start) throw new Error('Expected January 10 range start');
        const user = userEvent.setup();
        await user.click(start);
        await vi.waitFor(() => expect(runtime.mount.querySelector('output')?.textContent).toBe('10:10'));
        const disabled = runtime.mount.querySelector<HTMLButtonElement>('button[aria-label*="January 12th"]');

        if (!disabled) throw new Error('Expected disabled January 12');
        expect(disabled.disabled).toBe(true);
        await user.click(disabled);
        expect(runtime.mount.querySelector('output')?.textContent).toBe('10:10');
        const end = runtime.mount.querySelector<HTMLButtonElement>('button[aria-label*="January 14th"]');

        if (!end) throw new Error('Expected January 14 range end');
        await user.click(end);
        await vi.waitFor(() => expect(runtime.mount.querySelector('output')?.textContent).toBe('10:14'));
        expect(runtime.mount.querySelector('button[data-range-middle="true"]')).not.toBeNull();
        expect(runtime.mount.querySelector('[class*="authored-"]')).toBeNull();
        expect(runtime.mount.querySelector('[style*="red"]')).toBeNull();
        expect(runtime.mount.textContent).not.toContain('Replacement day');
    } finally {
        runtime.close();
    }
});

it('updates labeled Progress values inside the isolated View runtime', async () => {
    const runtime = await initializeRuntime(`export default function View() {
        const [value, setValue] = useState(25);
        return <>
            <Progress value={value} max={50} label="Storage" showValue />
            <Progress value={value} max={50} label={<span>Usage</span>} valueText={<strong>{value + ' / 50'}</strong>} />
            <button type="button" onClick={() => setValue(40)}>Update</button>
        </>;
    }`);

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('[role="progressbar"]')).not.toBeNull());
        const progress = runtime.mount.querySelector('[role="progressbar"]');
        expect(progress?.getAttribute('aria-valuenow')).toBe('25');
        expect(runtime.mount.querySelector('#' + progress?.getAttribute('aria-labelledby'))?.textContent).toBe(
            'Storage'
        );
        expect(runtime.mount.querySelector('[data-slot="progress-value"]')?.textContent).toBe('50%');
        const button = runtime.mount.querySelector('button');

        if (!button) throw new Error('Expected progress update button');
        await userEvent.setup().click(button);
        await vi.waitFor(() => expect(progress?.getAttribute('aria-valuenow')).toBe('40'));
        expect(runtime.mount.querySelector('[data-slot="progress-value"]')?.textContent).toBe('80%');
        expect(runtime.mount.querySelectorAll('[data-slot="progress-value"]')[1]?.textContent).toBe('40 / 50');
        expect(runtime.mount.querySelector('[data-slot="progress-value"] strong')?.textContent).toBe('40 / 50');
        runtime.send({ type: 'appearance', appearance: { theme: 'dark', accent: 'blue' } });
        expect(document.documentElement.dataset.theme).toBe('dark');
        expect(runtime.mount.querySelector('[role="progressbar"]')).toBe(progress);
    } finally {
        runtime.close();
    }
});

it('uses composed menu actions to transition authored table results to empty and back', async () => {
    const runtime = await initializeRuntime(`export default function View() {
        const [present, setPresent] = useState(true);
        const [open, setOpen] = useState(false);
        return <>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger>Order actions</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setPresent(false)}>Remove order</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            {present ? <Table aria-label="Orders">
                <TableCaption>Open orders</TableCaption>
                <TableHeader><TableRow><TableHead scope="col">Reference</TableHead></TableRow></TableHeader>
                <TableBody><TableRow><TableCell>PO-871</TableCell></TableRow></TableBody>
            </Table> : <Empty aria-label="Order results" title="No orders" description="The order was removed.">
                <button type="button" onClick={() => setPresent(true)}>Restore order</button>
            </Empty>}
        </>;
    }`);

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('tbody')?.textContent).toBe('PO-871'));
        const trigger = runtime.mount.querySelector('button');

        if (!trigger) throw new Error('Expected authored menu trigger');
        const user = userEvent.setup();
        await user.click(trigger);
        await vi.waitFor(() => expect(document.querySelector('[role="menuitem"]')?.textContent).toBe('Remove order'));
        const remove = document.querySelector('[role="menuitem"]');

        if (!remove) throw new Error('Expected authored menu item');
        await user.click(remove);
        await vi.waitFor(() => expect(runtime.mount.querySelector('table')).toBeNull());
        expect(runtime.mount.querySelector('[data-slot="empty-title"]')?.textContent).toBe('No orders');
        expect(runtime.mount.textContent).not.toContain('PO-871');
        await vi.waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
        const restore = runtime.mount.querySelector('[data-slot="empty-content"] button');

        if (!restore) throw new Error('Expected authored recovery action');
        await user.click(restore);
        await vi.waitFor(() => expect(runtime.mount.querySelector('tbody')?.textContent).toBe('PO-871'));
        expect(runtime.mount.querySelector('[data-slot="empty"]')).toBeNull();
    } finally {
        runtime.close();
    }
});

it('submits options-based Select and Combobox controls exported to authored JSX as selected form values', async () => {
    // Missing public exports or accidental adapter semantics must not break authored native form controls.
    const runtime = await initializeRuntime(`export default function View() {
        return <form>
            <Select name="status" aria-label="Status" defaultValue="open"
                options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} />
            <Combobox name="assignee" aria-label="Assignee" defaultValue="Ada"
                options={[{ value: 'Ada', label: 'Ada' }, { value: 'Grace', label: 'Grace' }]} />
        </form>;
    }`);

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('form')).not.toBeNull());
        const form = runtime.mount.querySelector('form');

        if (!form) throw new Error('Expected authored native form');
        const user = userEvent.setup();
        const select = form.querySelector('[aria-label="Status"]');

        if (!select) throw new Error('Expected exported Select trigger');
        await user.click(select);
        await vi.waitFor(() =>
            expect(document.querySelector('[role="option"][data-slot="select-item"]')).not.toBeNull()
        );

        const closed = Array.from(document.querySelectorAll('[role="option"]')).find(
            (item) => item.textContent === 'Closed'
        );

        if (!closed) throw new Error('Expected composed Select option');
        await user.click(closed);
        const input = form.querySelector<HTMLInputElement>('input[aria-label="Assignee"]');

        if (!input) throw new Error('Expected exported Combobox input');
        await user.clear(input);
        await user.type(input, 'Gra');
        await vi.waitFor(() =>
            expect(document.querySelector('[data-slot="combobox-item"]')?.textContent).toBe('Grace')
        );
        const grace = document.querySelector('[data-slot="combobox-item"]');

        if (!grace) throw new Error('Expected filtered Combobox option');
        await user.click(grace);
        await vi.waitFor(() => {
            const data = new FormData(form);
            expect(data.get('status')).toBe('closed');
            expect(data.get('assignee')).toBe('Grace');
        });
    } finally {
        runtime.close();
    }
});

it('edits and resets labeled text fields through the authored View boundary', async () => {
    // Native exports must preserve DOM events rather than substituting adapter string callbacks.
    const runtime = await initializeRuntime(`export default function View() {
        const [draft, setDraft] = useState('Initial');
        return <Box width={draft === 'Initial' ? 320 : 480} background="outline" onResetCapture={() => setDraft('Initial')}>
        <form>
            <Input id="draft" name="draft" label="Draft" value={draft}
                onChange={event => setDraft(event.currentTarget.value)} />
            <Textarea name="notes" aria-label="Notes" defaultValue="Original notes" />
            <Input name="excluded" defaultValue="Private" disabled />
            <output>{draft}</output>
            <button type="reset">Reset</button>
        </form>
        </Box>;
    }`);

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('form')).not.toBeNull());
        const form = runtime.mount.querySelector('form');
        const input = runtime.mount.querySelector<HTMLInputElement>('#draft');
        const notes = runtime.mount.querySelector('textarea');
        const reset = runtime.mount.querySelector('button');

        if (!form || !input || !notes || !reset) throw new Error('Expected composed native text fields');
        const user = userEvent.setup();
        await user.clear(input);
        await user.type(input, 'Edited');
        await user.clear(notes);
        await user.type(notes, 'New notes');
        expect(runtime.mount.querySelector('output')?.textContent).toBe('Edited');
        expect(runtime.mount.querySelector<HTMLElement>('[data-slot="box"]')?.style.width).toBe('480px');
        expect(runtime.mount.querySelector('#draft')).toBe(input);
        expect(new FormData(form).get('draft')).toBe('Edited');
        expect(new FormData(form).get('notes')).toBe('New notes');
        expect(new FormData(form).has('excluded')).toBe(false);
        await user.click(reset);
        await vi.waitFor(() => expect(input.value).toBe('Initial'));
        expect(notes.value).toBe('Original notes');
        expect(runtime.mount.querySelector('output')?.textContent).toBe('Initial');
        expect(runtime.mount.querySelector<HTMLElement>('[data-slot="box"]')?.style.width).toBe('320px');
    } finally {
        runtime.close();
    }
});

it('toggles and resets checkbox form data through its owned label in authored Views', async () => {
    const runtime = await initializeRuntime(`export default function View() {
        return <form>
            <Checkbox name="approved" label="Approved" defaultChecked />
            <button type="reset">Reset</button>
        </form>;
    }`);

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('label')).not.toBeNull());
        const form = runtime.mount.querySelector('form');
        const label = runtime.mount.querySelector('label');
        const reset = runtime.mount.querySelector<HTMLButtonElement>('button[type="reset"]');

        if (!form || !label || !reset) throw new Error('Expected the authored approval form');

        const user = userEvent.setup();

        expect(new FormData(form).getAll('approved')).toEqual(['on']);
        await user.click(label);
        expect(new FormData(form).has('approved')).toBe(false);
        await user.click(reset);
        await vi.waitFor(() => expect(new FormData(form).getAll('approved')).toEqual(['on']));
    } finally {
        runtime.close();
    }
});

it('edits and resets native ReUI time picker values through the authored View boundary', async () => {
    const runtime = await initializeRuntime(`export default function View() {
        return <form>
            <label htmlFor="native-time">Appointment</label>
            <TimePicker id="native-time" name="appointment" defaultValue="09:30" hourCycle={24}>
                <TimePickerInput />
                <TimePickerContent />
            </TimePicker>
            <button type="reset">Reset</button>
        </form>;
    }`);

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('#native-time')).not.toBeNull());
        const form = runtime.mount.querySelector('form');
        const input = runtime.mount.querySelector<HTMLInputElement>('#native-time');
        const reset = runtime.mount.querySelector<HTMLButtonElement>('button[type="reset"]');

        if (!form || !input || !reset) throw new Error('Expected the authored appointment form');

        const user = userEvent.setup();

        await user.clear(input);
        await user.type(input, '10:15');
        await user.tab();
        expect(new FormData(form).getAll('appointment')).toEqual(['10:15']);
        await user.click(reset);
        await vi.waitFor(() => expect(new FormData(form).getAll('appointment')).toEqual(['09:30']));
        expect(input.value).toBe('09:30');
    } finally {
        runtime.close();
    }
});

it('keeps navigation and attachment downloads on distinct scoped capabilities in authored Views', async () => {
    const runtime = await initializeRuntime(`export default function View() {
        return <>
            <Link href="/orders" aria-label="Orders"><span>Orders</span></Link>
            <Link href="/api/report" download="report.pdf">Download report</Link>
        </>;
    }`);

    const navigation = vi.fn();
    const downloads = vi.fn();

    runtime.channel.port2.onmessage = (event: MessageEvent<unknown>) => {
        const command = commandSchema.parse(event.data);

        if (command.type === 'navigate') navigation(command.path);

        if (command.type === 'download') {
            downloads(command.path, command.filename);
            runtime.send({ id: command.id, ok: true, data: null });
        }
    };

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('button')?.textContent).toBe('Download report'));
        const orders = runtime.mount.querySelector<HTMLAnchorElement>('a[aria-label="Orders"]');

        const report = Array.from(runtime.mount.querySelectorAll('button')).find(
            (anchor) => anchor.textContent === 'Download report'
        );

        if (!orders || !report) throw new Error('Expected the authored navigation and attachment links');

        const user = userEvent.setup();

        await user.click(orders);
        await vi.waitFor(() => expect(navigation).toHaveBeenCalledExactlyOnceWith('/orders'));
        expect(downloads).not.toHaveBeenCalled();
        expect(report.hasAttribute('download')).toBe(false);
        await user.click(report);
        await vi.waitFor(() => expect(downloads).toHaveBeenCalledExactlyOnceWith('/api/report', 'report.pdf'));
        expect(navigation).toHaveBeenCalledTimes(1);
    } finally {
        runtime.close();
    }
});

it('controls a native compound Dialog with public Buttons inside an authored View', async () => {
    const runtime = await initializeRuntime(`export default function View() {
        const [open, setOpen] = useState(false);
        return <>
            <Button variant="outline" onClick={() => setOpen(true)}>Open order</Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogTitle>Order details</DialogTitle>
                <p>Review the order</p>
                </DialogContent>
            </Dialog>
        </>;
    }`);

    try {
        await vi.waitFor(() => expect(runtime.mount.querySelector('button')?.textContent).toContain('Open order'));
        const user = userEvent.setup();
        const trigger = runtime.mount.querySelector('button');

        if (!trigger) throw new Error('Expected dialog opener');
        await user.click(trigger);
        await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull());
        const dialog = document.querySelector('[role="dialog"]');
        const titleId = dialog?.getAttribute('aria-labelledby');

        expect(document.getElementById(titleId ?? '')?.textContent).toBe('Order details');
        expect(dialog?.closest('[data-theme-scope="stone"]')).toBe(document.documentElement);

        const close = dialog?.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]');

        if (!close) throw new Error('Expected dialog close button');
        await user.click(close);
        await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
        await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    } finally {
        runtime.close();
    }
});

it('updates scrolled viewport geometry through the admitted port and releases nested fullscreen state', async () => {
    const runtime = await initializeRuntime(`export default function View() {
        return <div style={{height: 6000}}>
            <Dialog defaultOpen>
                <DialogContent>
                    <DialogTitle>Order details</DialogTitle>
                    <Dialog fullscreen>
                        <DialogTrigger>Preview</DialogTrigger>
                        <DialogContent><DialogTitle>Attachment</DialogTitle></DialogContent>
                    </Dialog>
                </DialogContent>
            </Dialog>
        </div>;
    }`);

    try {
        await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull());
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]');

        if (!dialog) throw new Error('Missing standard dialog');
        const root = document.documentElement;
        expect(root.hasAttribute('data-view-runtime')).toBe(true);
        runtime.channel.port2.postMessage({ type: 'viewport', top: 1200, bottom: 4200, height: 600 });
        await vi.waitFor(() => expect(root.style.getPropertyValue('--view-viewport-top')).toBe('1200px'));
        expect(root.style.getPropertyValue('--view-viewport-height')).toBe('600px');

        runtime.channel.port2.postMessage({ type: 'viewport', top: 1800, bottom: 3800, height: 400 });
        await vi.waitFor(() => expect(root.style.getPropertyValue('--view-viewport-top')).toBe('1800px'));
        expect(root.style.getPropertyValue('--view-viewport-height')).toBe('400px');
        const trigger = dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-trigger"]');

        if (!trigger) throw new Error('Missing fullscreen trigger');
        const user = userEvent.setup();
        await user.click(trigger);
        await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(2));
        expect(root.hasAttribute('data-view-fullscreen')).toBe(true);
        runtime.channel.port2.postMessage({ type: 'viewport', top: 0, bottom: 0, height: 900 });
        await vi.waitFor(() => expect(root.style.getPropertyValue('--view-viewport-top')).toBe('0px'));
        expect(root.style.getPropertyValue('--view-viewport-height')).toBe('900px');
        await user.keyboard('{Escape}');
        await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1));
        expect(root.hasAttribute('data-view-fullscreen')).toBe(false);
        runtime.channel.port2.postMessage({ type: 'viewport', top: 1800, bottom: 3800, height: 400 });
        await vi.waitFor(() => expect(root.style.getPropertyValue('--view-viewport-top')).toBe('1800px'));
        expect(root.style.getPropertyValue('--view-viewport-height')).toBe('400px');
        expect(document.activeElement).toBe(trigger);
    } finally {
        runtime.close();
    }

    expect(document.documentElement.hasAttribute('data-view-runtime')).toBe(false);
    expect(document.documentElement.hasAttribute('data-view-fullscreen')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--view-viewport-top')).toBe('');
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
