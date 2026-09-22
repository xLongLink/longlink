// @vitest-environment happy-dom
import { act } from 'react';
import type { createRoot } from 'react-dom/client';
import { DialogCloseContext } from '@/xml/adapters/Dialog';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContext, parseFragment, cleanupMountedRoot, mountXml, renderXmlToMarkup } from '../helpers';

const toast = vi.fn();

vi.mock('@astryxdesign/core/Toast', async (importOriginal) => ({
    ...(await importOriginal()),
    useToast: () => toast,
}));

describe('Action', () => {
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(async () => {
        vi.unstubAllGlobals();
        toast.mockClear();

        await cleanupMountedRoot(root);
        root = undefined;
    });

    it.each([
        {
            error: 'Action requires exactly one direct Button or Link trigger',
            xml: '<Action><Button>Save</Button><Link to="/profile">Profile</Link></Action>',
        },
        {
            error: 'Action effects must precede its Button or Link trigger',
            xml: '<Action><Button>Save</Button><Request url="/profile" method="PATCH" /></Action>',
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

        const button = await renderAction(
            '<Action><Request url="/orders" method="patch" json="${{name: \'Ada\'}}" /><Button to="/orders">Save</Button></Action>',
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

    it('prevents default Link navigation until Action effects complete', async () => {
        // Arrange
        const ctx = createContext({ navigate: vi.fn() });
        let completeRequest: (() => void) | undefined;
        const fetchRequest = vi.fn(
            () =>
                new Promise<Response>(
                    (resolve) => (completeRequest = () => resolve(new Response('{}', { status: 201 })))
                )
        );
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        vi.stubGlobal('fetch', fetchRequest);
        const link = await renderAction(
            '<Action><Request url="/orders" method="POST" /><Link to="/orders">Save</Link></Action>',
            ctx
        );

        // Act
        await act(async () => {
            link.dispatchEvent(event);
            await vi.waitFor(() => expect(fetchRequest).toHaveBeenCalledOnce());
        });

        // Assert navigation does not begin while the request is pending.
        expect(event.defaultPrevented).toBe(true);
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

        const button = await renderAction(
            '<Action><Request url="/orders" method="POST" form="$payload" /><Button>Save</Button></Action>',
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
    ])('skips Action Link effects for %s clicks', async (_clickType, event) => {
        const ctx = createContext();
        const fetchRequest = vi.fn();
        vi.stubGlobal('fetch', fetchRequest);

        const link = await renderAction(
            '<Action><Request url="/orders" method="POST" /><Link to="/orders">Save</Link></Action>',
            ctx
        );

        await act(async () => link.dispatchEvent(event));

        expect(fetchRequest).not.toHaveBeenCalled();
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
    ])('does not patch state, navigate, or close when a request fails: $error', async ({ error, fetch }) => {
        // Arrange
        const ctx = createContext({ navigate: vi.fn() });
        const closeDialog = vi.fn();
        vi.stubGlobal('fetch', fetch);

        const button = await renderAction(
            '<State id="form" value="draft" /><Action><Request url="/orders" method="POST" closeDialog="true" /><Patch state="form" value="${{value: \'published\'}}" /><Link to="/orders">Save</Link></Action>',
            ctx,
            closeDialog
        );

        // Act
        await act(async () => {
            button.click();
            await vi.waitFor(() => expect(toast).toHaveBeenCalledOnce());
        });

        // Assert
        expect(ctx.scope.bindings.form).toEqual({ value: 'draft' });
        expect(ctx.services.navigate).not.toHaveBeenCalled();
        expect(closeDialog).not.toHaveBeenCalled();
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({ body: error, type: 'error' }));
    });

    it('closes the dialog after a successful request', async () => {
        // Arrange
        const ctx = createContext();
        const closeDialog = vi.fn();
        vi.stubGlobal('fetch', async () => new Response('{}', { status: 201 }));

        // Act
        const button = await renderAction(
            '<Action><Request url="/orders" method="POST" closeDialog="true" /><Button to="javascript:alert(1)">Save</Button></Action>',
            ctx,
            closeDialog
        );

        await act(async () => {
            button.click();
            await vi.waitFor(() => expect(toast).toHaveBeenCalledOnce());
        });

        // Assert
        expect(toast).toHaveBeenCalledWith({ body: 'Request completed with status 201' });
        expect(closeDialog).toHaveBeenCalledOnce();
    });

    it('navigates instead of closing or toasting after a successful Action Link request', async () => {
        // Arrange
        const ctx = createContext({ navigate: vi.fn(), requestBaseUrl: '/proxy/' });
        const closeDialog = vi.fn();
        vi.stubGlobal('fetch', async () => new Response('{}', { status: 201 }));
        const link = await renderAction(
            '<Action><Request url="/orders" method="POST" closeDialog="true" /><Link href="/orders">Save</Link></Action>',
            ctx,
            closeDialog
        );

        // Act
        await act(async () => {
            link.click();
            await vi.waitFor(() => expect(ctx.services.navigate).toHaveBeenCalledWith('/proxy/orders'));
        });

        // Assert
        expect(closeDialog).not.toHaveBeenCalled();
        expect(toast).not.toHaveBeenCalled();
    });

    it.each([
        {
            error: 'Request cannot send both form and json payloads',
            request: 'method="POST" form="${{name: \'Ada\'}}" json="${{name: \'Ada\'}}"',
        },
        {
            error: 'GET requests cannot send payloads',
            request: 'method="GET" json="${{name: \'Ada\'}}"',
        },
        {
            error: 'form must evaluate to an object',
            request: 'method="POST" form="invalid"',
        },
    ])('does not execute invalid request payloads: $error', async ({ request }) => {
        const ctx = createContext({ navigate: vi.fn() });
        const closeDialog = vi.fn();
        const fetchRequest = vi.fn();
        vi.stubGlobal('fetch', fetchRequest);

        const button = await renderAction(
            `<Action><Request url="/orders" ${request} closeDialog="true" /><Button to="/orders">Save</Button></Action>`,
            ctx,
            closeDialog
        );

        await act(async () => {
            button.click();
            await vi.waitFor(() => expect(toast).toHaveBeenCalledOnce());
        });

        expect(toast).toHaveBeenCalledWith(
            expect.objectContaining({ body: 'The request could not be completed. Please try again.', type: 'error' })
        );
        expect(fetchRequest).not.toHaveBeenCalled();
        expect(ctx.services.navigate).not.toHaveBeenCalled();
        expect(closeDialog).not.toHaveBeenCalled();
    });

    it('blocks an external Action request URL before transport', async () => {
        // Arrange
        const ctx = createContext({ navigate: vi.fn(), requestBaseUrl: '/api/solutions/123/proxy' });
        const fetchRequest = vi.fn();
        vi.stubGlobal('fetch', fetchRequest);
        const button = await renderAction(
            '<State id="form" value="draft" /><Action><Request url="https://evil.example/orders" method="POST" /><Patch state="form" value="${{value: \'submitted\'}}" /><Link to="/orders">Save</Link></Action>',
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
        const ctx = createContext({ navigate: vi.fn() });
        const button = await renderAction(
            '<State id="form" value="draft" /><Action><Patch state="form" invalidate="true" /><Button>Reset</Button></Action>',
            ctx
        );
        (ctx.scope.bindings.form as { value: string }).value = 'changed';

        await act(async () => {
            button.click();
            await vi.waitFor(() => expect((ctx.scope.bindings.form as { value: string }).value).toBe('draft'));
        });

        expect(ctx.services.navigate).not.toHaveBeenCalled();
    });

    it('updates declared State properties through Patch', async () => {
        // Arrange
        const ctx = createContext();
        const button = await renderAction(
            '<State id="form" value="draft" count="1" untouched="keep" /><Action><Patch state="form" value="${{value: \'published\', count: 2}}" /><Button>Save</Button></Action>',
            ctx
        );

        // Act
        await act(async () => button.click());

        // Assert
        expect(ctx.scope.bindings.form).toEqual({ value: 'published', count: 2, untouched: 'keep' });
    });

    it('does not update undeclared State properties through Patch', async () => {
        const ctx = createContext();
        const button = await renderAction(
            '<State id="form" value="draft" /><Action><Patch state="form" value="${{other: \'changed\'}}" /><Button>Save</Button></Action>',
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
            error: 'Patch requires exactly one of value or invalidate="true"',
            setup: '<State id="form" value="draft" />',
            patch: '<Patch state="form" />',
        },
        {
            error: 'Patch requires exactly one of value or invalidate="true"',
            setup: '<State id="form" value="draft" />',
            patch: '<Patch state="form" value="${{value: \'published\'}}" invalidate="true" />',
        },
        {
            error: 'Patch state "missing" does not reference a declared State or Query',
            setup: '',
            patch: '<Patch state="missing" invalidate="true" />',
        },
        {
            error: 'Patch state "records" must reference a declared State',
            setup: '<Query id="records" path="/records" />',
            patch: '<Patch state="records" value="${{value: \'published\'}}" />',
        },
    ])('rejects invalid Patch contracts without executing downstream requests: $error', async ({ setup, patch }) => {
        // Arrange
        const ctx = createContext();
        const fetchRequest = vi.fn(async () => new Response('{}'));
        vi.stubGlobal('fetch', fetchRequest);
        const button = await renderAction(
            `${setup}<Action>${patch}<Request url="/orders" method="POST" /><Button>Save</Button></Action>`,
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
        expect(toast).toHaveBeenCalledOnce();
        expect(toast).toHaveBeenCalledWith(
            expect.objectContaining({ body: 'The request could not be completed. Please try again.', type: 'error' })
        );
    });

    async function renderAction(
        xml: string,
        ctx: ReturnType<typeof createContext>,
        closeDialog: (() => void) | null = null
    ) {
        // Mount through the shared helper so ACT and root lifetime stay in one owner.
        const mounted = await mountXml(
            xml,
            ctx,
            (node) => <DialogCloseContext.Provider value={closeDialog}>{node}</DialogCloseContext.Provider>
        );
        root = mounted.root;
        const container = mounted.container;

        const button = container.querySelector('button, a');
        if (!button) throw new Error('Action trigger did not render');

        return button as HTMLButtonElement;
    }
});
