// @vitest-environment happy-dom
import { act } from 'react';
import { RenderXML } from '@/xml/renderers';
import { parseXML } from '@/xml/core/parser';
import { createRoot } from 'react-dom/client';
import { renderXmlToMarkup } from '../helpers';
import { createContext } from '@/xml/core/context';
import { DialogCloseContext } from '@/xml/adapters/Dialog';
import { afterEach, describe, expect, it, vi } from 'vitest';

const toast = vi.fn();

vi.mock('@/lib/hooks/use-toast', () => ({ useToast: () => toast }));

describe('Action', () => {
    let container: HTMLDivElement | undefined;
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(async () => {
        vi.unstubAllGlobals();
        toast.mockClear();

        if (root) {
            const renderedRoot = root;
            await act(async () => renderedRoot.unmount());
        }
        container = undefined;
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
        expect(() => renderXmlToMarkup(parseXML(xml))).toThrow(error);
    });

    it('sends the configured request method and JSON payload before navigating', async () => {
        const ctx = createContext();
        const events: string[] = [];
        let requestBody = '';
        let requestMethod = '';
        const fetchRequest = vi.fn(async (input: RequestInfo | URL) => {
            const request = input as Request;
            requestBody = await request.clone().text();
            requestMethod = request.method;
            events.push('request-complete');

            return new Response('{}', { status: 201 });
        });
        ctx.services.navigate = vi.fn(() => events.push('navigate'));
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
            fetch: async () => new Response(JSON.stringify({ detail: 'Denied' }), { status: 403 }),
        },
        {
            error: 'Network unavailable',
            fetch: async () => Promise.reject(new Error('Network unavailable')),
        },
    ])('does not navigate or close when a request fails: $error', async ({ error, fetch }) => {
        const ctx = createContext();
        const closeDialog = vi.fn();
        ctx.services.navigate = vi.fn();
        vi.stubGlobal('fetch', fetch);

        const button = await renderAction(
            '<Action><Request url="/orders" method="POST" closeDialog="true" /><Link to="/orders">Save</Link></Action>',
            ctx,
            closeDialog
        );

        await act(async () => {
            button.click();
            await vi.waitFor(() => expect(toast).toHaveBeenCalledOnce());
        });

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

    it.each([
        {
            error: 'Request cannot send both form and json payloads',
            request: 'method="POST" form="${{name: \'Ada\'}}" json="${{name: \'Ada\'}}"',
        },
        {
            error: 'GET requests cannot send payloads',
            request: 'method="GET" json="${{name: \'Ada\'}}"',
        },
    ])('does not execute invalid request payloads: $error', async ({ error, request }) => {
        const ctx = createContext();
        const closeDialog = vi.fn();
        const fetchRequest = vi.fn();
        ctx.services.navigate = vi.fn();
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

        expect(toast).toHaveBeenCalledWith(expect.objectContaining({ body: error, type: 'error' }));
        expect(fetchRequest).not.toHaveBeenCalled();
        expect(ctx.services.navigate).not.toHaveBeenCalled();
        expect(closeDialog).not.toHaveBeenCalled();
    });

    it('invalidates declared State through Patch', async () => {
        const ctx = createContext();
        const button = await renderAction(
            '<State id="form" value="draft" /><Action><Patch state="form" invalidate="true" /><Button>Reset</Button></Action>',
            ctx
        );
        (ctx.scope.bindings.form as { value: string }).value = 'changed';

        await act(async () => {
            button.click();
            await vi.waitFor(() => expect((ctx.scope.bindings.form as { value: string }).value).toBe('draft'));
        });
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
            expect.objectContaining({ body: 'Patch cannot update undeclared State property "other"', type: 'error' })
        );
    });

    async function renderAction(
        xml: string,
        ctx: ReturnType<typeof createContext>,
        closeDialog: (() => void) | null = null
    ) {
        const ast = parseXML(`<longlink>${xml}</longlink>`)[0];
        container = document.createElement('div');
        root = createRoot(container);
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

        await act(async () => {
            root?.render(
                <DialogCloseContext.Provider value={closeDialog}>
                    <RenderXML ast={ast} ctx={ctx} />
                </DialogCloseContext.Provider>
            );
        });

        const button = container.querySelector('button, a');
        if (!button) throw new Error('Action trigger did not render');

        return button as HTMLButtonElement;
    }
});
