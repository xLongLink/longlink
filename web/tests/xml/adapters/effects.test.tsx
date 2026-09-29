// @vitest-environment happy-dom
import { act } from 'react';
import type { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContext, parseFragment, cleanupMountedRoot, mountXml, renderXmlToMarkup } from '../helpers';

const toast = vi.fn();

vi.mock('@astryxdesign/core/Toast', async (importOriginal) => ({
    ...(await importOriginal()),
    useToast: () => toast,
}));

describe('Control effects', () => {
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(async () => {
        vi.unstubAllGlobals();
        toast.mockClear();

        await cleanupMountedRoot(root);
        root = undefined;
    });

    it.each([
        {
            error: 'Link does not support direct Button children',
            xml: '<Link label="Profile" to="/profile"><Button>Save</Button></Link>',
        },
        {
            error: 'Button effects require a label',
            xml: '<Button><Request url="/profile" method="PATCH" /></Button>',
        },
    ])('rejects invalid structure: $error', ({ error, xml }) => {
        expect(() => renderXmlToMarkup(parseFragment(xml))).toThrow(error);
    });

    it('sends the configured request method and JSON payload before navigating', async () => {
        const events: string[] = [];
        const ctx = createContext({ navigate: vi.fn(() => events.push('navigate')) });
        let requestBody = '';
        let requestMethod = '';
        const fetchRequest = vi.fn(async (input: RequestInfo | URL) => {
            const request = input as Request;
            requestBody = await request.clone().text();
            requestMethod = request.method;
            events.push('request-complete');

            return new Response('{}', { status: 201 });
        });
        vi.stubGlobal('fetch', fetchRequest);

        const button = await renderControl(
            '<Button label="Save" to="/orders"><Request url="/orders" method="patch" json="${{name: \'Ada\'}}" /></Button>',
            ctx
        );

        await act(async () => {
            button.click();
            await vi.waitFor(() => expect(fetchRequest).toHaveBeenCalledOnce());
        });

        expect(requestMethod).toBe('PATCH');
        expect(JSON.parse(requestBody)).toEqual({ name: 'Ada' });
        expect(ctx.services.navigate).toHaveBeenCalledWith('/orders');
        expect(events).toEqual(['request-complete', 'navigate']);
    });

    it('waits for Link effects before navigating', async () => {
        // Arrange
        const ctx = createContext({ navigate: vi.fn() });
        let completeRequest: (() => void) | undefined;
        const fetchRequest = vi.fn(
            () =>
                new Promise<Response>(
                    (resolve) => (completeRequest = () => resolve(new Response('{}', { status: 201 })))
                )
        );
        vi.stubGlobal('fetch', fetchRequest);
        const link = await renderControl(
            '<Link label="Save" to="/orders"><Request url="/orders" method="POST" /></Link>',
            ctx
        );

        // Act
        await act(async () => {
            link.click();
            await vi.waitFor(() => expect(fetchRequest).toHaveBeenCalledOnce());
        });

        // Assert navigation does not begin while the request is pending.
        expect(ctx.services.navigate).not.toHaveBeenCalled();

        const resolveRequest = completeRequest;
        if (!resolveRequest) throw new Error('Request did not start');

        await act(async () => resolveRequest());

        expect(ctx.services.navigate).toHaveBeenCalledWith('/orders');
    });

    it('serializes Request form values as multipart entries', async () => {
        const ctx = createContext();
        let formEntries: [string, string][] = [];
        const fetchRequest = vi.fn(async (input: RequestInfo | URL) => {
            const formData = await (input as Request).formData();
            formEntries = Array.from(formData.entries()) as [string, string][];

            return new Response('{}', { status: 201 });
        });
        vi.stubGlobal('fetch', fetchRequest);

        const button = await renderControl(
            '<Button label="Save"><Request url="/orders" method="POST" form="$payload" /></Button>',
            ctx
        );
        ctx.scope.bindings.payload = {
            name: 'Ada',
            tags: ['new', 'priority'],
            metadata: { source: 'web' },
            ignored: null,
        };

        await act(async () => {
            button.click();
            await vi.waitFor(() => expect(fetchRequest).toHaveBeenCalledOnce());
        });

        expect(formEntries).toEqual([
            ['name', 'Ada'],
            ['tags', 'new'],
            ['tags', 'priority'],
            ['metadata', '{"source":"web"}'],
        ]);
    });

    it.each([
        ['modified', new MouseEvent('click', { bubbles: true, ctrlKey: true })],
        ['middle', new MouseEvent('click', { bubbles: true, button: 1 })],
    ])('runs Link effects for %s clicks without bypassing them', async (_clickType, event) => {
        const ctx = createContext();
        const fetchRequest = vi.fn(async () => new Response('{}', { status: 201 }));
        vi.stubGlobal('fetch', fetchRequest);

        const link = await renderControl(
            '<Link label="Save" to="/orders"><Request url="/orders" method="POST" /></Link>',
            ctx
        );

        await act(async () => link.dispatchEvent(event));

        expect(fetchRequest).toHaveBeenCalledOnce();
    });

    it.each([
        {
            error: 'Denied',
            fetch: async () => Response.json({ detail: 'Denied' }, { status: 403 }),
        },
        {
            error: 'The request could not be completed. Please try again.',
            fetch: async () => Promise.reject(new Error('Network unavailable')),
        },
    ])('does not patch state or navigate when a request fails: $error', async ({ error, fetch }) => {
        // Arrange
        const ctx = createContext({ navigate: vi.fn() });
        vi.stubGlobal('fetch', fetch);

        const button = await renderControl(
            '<State id="form" value="draft" open="${true}" /><Link label="Save" to="/orders"><Request url="/orders" method="POST" /><Patch state="form" value="${{value: \'published\'}}" /><Patch state="form" value="${{open: false}}" /></Link>',
            ctx
        );

        // Act
        await act(async () => {
            button.click();
            await vi.waitFor(() => expect(toast).toHaveBeenCalledOnce());
        });

        // Assert
        expect(ctx.scope.bindings.form).toEqual({ value: 'draft', open: true });
        expect(ctx.services.navigate).not.toHaveBeenCalled();
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({ body: error, type: 'error' }));
    });

    it('patches dialog state after successful effects', async () => {
        // Arrange
        const ctx = createContext();
        vi.stubGlobal('fetch', async () => new Response('{}', { status: 201 }));

        // Act
        const button = await renderControl(
            '<State id="dialog" open="${true}" /><Button label="Save"><Request url="/orders" method="POST" /><Patch state="dialog" value="${{open: false}}" /></Button>',
            ctx
        );

        await act(async () => {
            button.click();
            await vi.waitFor(() => expect(toast).toHaveBeenCalledOnce());
        });

        // Assert
        expect(toast).toHaveBeenCalledWith({ body: 'Request completed with status 201' });
        expect(ctx.scope.bindings.dialog).toEqual({ open: false });
    });

    it('navigates without toasting after a successful Link request', async () => {
        // Arrange
        const ctx = createContext({ navigate: vi.fn(), requestBaseUrl: '/proxy/' });
        vi.stubGlobal('fetch', async () => new Response('{}', { status: 201 }));
        const link = await renderControl(
            '<State id="dialog" open="${true}" /><Link label="Save" href="/orders"><Request url="/orders" method="POST" /></Link>',
            ctx
        );

        // Act
        await act(async () => {
            link.click();
            await vi.waitFor(() => expect(ctx.services.navigate).toHaveBeenCalledWith('/proxy/orders'));
        });

        // Assert
        expect(ctx.scope.bindings.dialog).toEqual({ open: true });
        expect(toast).not.toHaveBeenCalled();
    });

    it.each([
        {
            name: 'both form and json payloads',
            request: 'method="POST" form="${{name: \'Ada\'}}" json="${{name: \'Ada\'}}"',
        },
        {
            name: 'a GET payload',
            request: 'method="GET" json="${{name: \'Ada\'}}"',
        },
        {
            name: 'a non-object form',
            request: 'method="POST" form="invalid"',
        },
    ])('does not execute invalid request payloads: $name', async ({ request }) => {
        const navigate = vi.fn();
        const ctx = createContext({ navigate });
        const fetchRequest = vi.fn();
        vi.stubGlobal('fetch', fetchRequest);

        const button = await renderControl(`<Button label="Save"><Request url="/orders" ${request} /></Button>`, ctx);

        await act(async () => {
            button.click();
            await vi.waitFor(() => expect(toast).toHaveBeenCalledOnce());
        });

        expect(toast).toHaveBeenCalledWith(
            expect.objectContaining({ body: 'The request could not be completed. Please try again.', type: 'error' })
        );
        expect(fetchRequest).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
    });

    it('blocks an external Action request URL before transport', async () => {
        // Arrange
        const ctx = createContext({ navigate: vi.fn(), requestBaseUrl: '/api/solutions/123/proxy' });
        const fetchRequest = vi.fn();
        vi.stubGlobal('fetch', fetchRequest);
        const button = await renderControl(
            '<State id="form" value="draft" /><Link label="Save" to="/orders"><Request url="https://evil.example/orders" method="POST" /><Patch state="form" value="${{value: \'submitted\'}}" /></Link>',
            ctx
        );

        // Act
        await act(async () => {
            button.click();
            await vi.waitFor(() => expect(toast).toHaveBeenCalledOnce());
        });

        // Assert
        expect(fetchRequest).not.toHaveBeenCalled();
        expect(ctx.scope.bindings.form).toEqual({ value: 'draft' });
        expect(ctx.services.navigate).not.toHaveBeenCalled();
    });

    it('invalidates declared State through Patch', async () => {
        const ctx = createContext();
        const button = await renderControl(
            '<State id="form" value="draft" /><Button label="Reset"><Patch state="form" invalidate="true" /></Button>',
            ctx
        );
        (ctx.scope.bindings.form as { value: string }).value = 'changed';

        await act(async () => {
            button.click();
            await vi.waitFor(() => expect((ctx.scope.bindings.form as { value: string }).value).toBe('draft'));
        });
    });

    it('updates declared State properties through Patch', async () => {
        // Arrange
        const ctx = createContext();
        const button = await renderControl(
            '<State id="form" value="draft" count="1" untouched="keep" /><Button label="Save"><Patch state="form" value="${{value: \'published\', count: 2}}" /></Button>',
            ctx
        );

        // Act
        await act(async () => button.click());

        // Assert
        expect(ctx.scope.bindings.form).toEqual({ value: 'published', count: 2, untouched: 'keep' });
    });

    it('does not update undeclared State properties through Patch', async () => {
        const ctx = createContext();
        const button = await renderControl(
            '<State id="form" value="draft" /><Button label="Save"><Patch state="form" value="${{other: \'changed\'}}" /></Button>',
            ctx
        );

        await act(async () => {
            button.click();
            await vi.waitFor(() => expect(toast).toHaveBeenCalledOnce());
        });

        expect(ctx.scope.bindings.form).toEqual({ value: 'draft' });
        expect(toast).toHaveBeenCalledWith(
            expect.objectContaining({ body: 'The request could not be completed. Please try again.', type: 'error' })
        );
    });

    it.each([
        {
            name: 'neither value nor invalidate',
            setup: '<State id="form" value="draft" />',
            patch: '<Patch state="form" />',
        },
        {
            name: 'both value and invalidate',
            setup: '<State id="form" value="draft" />',
            patch: '<Patch state="form" value="${{value: \'published\'}}" invalidate="true" />',
        },
        {
            name: 'an undeclared state',
            setup: '',
            patch: '<Patch state="missing" invalidate="true" />',
        },
        {
            name: 'a Query instead of a State',
            setup: '<Query id="records" path="/records" />',
            patch: '<Patch state="records" value="${{value: \'published\'}}" />',
        },
    ])('rejects invalid Patch contracts without executing downstream requests: $name', async ({ setup, patch }) => {
        // Arrange
        const ctx = createContext();
        const fetchRequest = vi.fn(async () => new Response('{}'));
        vi.stubGlobal('fetch', fetchRequest);
        const button = await renderControl(
            `${setup}<Button label="Save">${patch}<Request url="/orders" method="POST" /></Button>`,
            ctx
        );

        // Exclude the Query's initial setup request.
        fetchRequest.mockClear();

        // Act
        await act(async () => {
            button.click();
            await vi.waitFor(() => expect(toast).toHaveBeenCalledOnce());
        });

        // Assert
        expect(fetchRequest).not.toHaveBeenCalled();
        expect(toast).toHaveBeenCalledWith(
            expect.objectContaining({ body: 'The request could not be completed. Please try again.', type: 'error' })
        );
    });

    async function renderControl(xml: string, ctx: ReturnType<typeof createContext>) {
        // Mount through the shared helper so ACT and root lifetime stay in one owner.
        const mounted = await mountXml(xml, ctx);
        root = mounted.root;
        const container = mounted.container;

        const button = container.querySelector('button, a');
        if (!button) throw new Error('Control did not render');

        return button as HTMLButtonElement;
    }
});
