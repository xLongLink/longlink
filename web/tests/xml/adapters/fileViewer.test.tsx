// @vitest-environment happy-dom
import { act } from 'react';
import { parseXML } from '@/xml/core/parser';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContext, parseFragment, RenderXML, renderXmlToMarkup } from '../helpers';

describe('FileViewer', () => {
    let root: ReturnType<typeof createRoot> | undefined;

    beforeEach(() => {
        // Force the immediate loading path unless a test provides its own observer.
        vi.stubGlobal('IntersectionObserver', undefined);

        if (typeof URL.createObjectURL === 'function') {
            vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
            vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        } else {
            Object.defineProperty(URL, 'createObjectURL', {
                configurable: true,
                value: vi.fn(() => 'blob:preview'),
            });
            Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
        }
    });

    afterEach(async () => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();

        if (root) {
            const mountedRoot = root;
            await act(async () => mountedRoot.unmount());
        }
        root = undefined;
        document.body.innerHTML = '';
    });

    async function renderViewer(xml: string, ctx = createContext({ requestBaseUrl: '/api/v1/solutions/demo/proxy' })) {
        const ast = parseXML(`<longlink>${xml}</longlink>`);
        const container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

        await act(async () => {
            root?.render(<RenderXML ast={ast} ctx={ctx} />);
        });

        return container;
    }

    function pdfResponse() {
        return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
            headers: { 'content-type': 'application/pdf' },
            status: 200,
        });
    }

    it('renders PDF bytes in a sandboxed iframe and releases the preview on unmount', async () => {
        let requestUrl = '';
        const fetchRequest = vi.fn(async (input: RequestInfo | URL) => {
            requestUrl = (input as Request).url;

            return pdfResponse();
        });
        vi.stubGlobal('fetch', fetchRequest);
        const container = await renderViewer('<FileViewer src="/api/items/1/attachments/a.pdf" title="Contract" />');

        await vi.waitFor(() => expect(container.querySelector('iframe')).not.toBeNull());
        const frame = container.querySelector('iframe');
        expect(fetchRequest).toHaveBeenCalledOnce();
        expect(requestUrl).toContain('/api/v1/solutions/demo/proxy/api/items/1/attachments/a.pdf');
        expect(frame?.getAttribute('src')).toBe('blob:preview');
        expect(frame?.hasAttribute('sandbox')).toBe(false);
        expect(frame?.getAttribute('title')).toBe('Contract');

        await act(async () => root?.unmount());
        root = undefined;
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    });

    it('defers the download until the preview becomes visible', async () => {
        let observe: IntersectionObserverCallback | undefined;
        vi.stubGlobal(
            'IntersectionObserver',
            class {
                constructor(callback: IntersectionObserverCallback) {
                    observe = callback;
                }

                observe() {}

                disconnect() {}
            }
        );
        const fetchRequest = vi.fn(async () => pdfResponse());
        vi.stubGlobal('fetch', fetchRequest);
        const container = await renderViewer('<FileViewer src="/api/items/1/attachments/a.pdf" title="Contract" />');

        expect(fetchRequest).not.toHaveBeenCalled();

        await act(async () =>
            observe?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
        );
        await vi.waitFor(() => expect(container.querySelector('iframe')).not.toBeNull());
        expect(fetchRequest).toHaveBeenCalledOnce();
    });

    it.each([
        { type: 'image/png', tag: 'img' },
        { type: 'video/mp4', tag: 'video' },
        { type: 'audio/mpeg', tag: 'audio' },
    ])('previews $type inline with a $tag element', async ({ type, tag }) => {
        // Arrange
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': type } }))
        );
        const container = await renderViewer('<FileViewer src="/api/items/1/attachments/media.bin" title="Media" />');

        // Act
        await vi.waitFor(() => expect(container.querySelector(tag)).not.toBeNull());

        // Assert
        const element = container.querySelector(tag);
        expect(container.querySelector('iframe')).toBeNull();
        expect(element?.getAttribute('src')).toBe('blob:preview');
        expect(element?.getAttribute(tag === 'img' ? 'alt' : 'aria-label')).toBe('Media');
    });

    it('falls back to a new-tab link for non-PDF files', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('hello', { headers: { 'content-type': 'text/plain' } }))
        );
        const container = await renderViewer('<FileViewer src="/api/items/1/attachments/notes.txt" title="Notes" />');

        await vi.waitFor(() => expect(container.querySelector('a')).not.toBeNull());
        const link = container.querySelector('a');
        expect(container.querySelector('iframe')).toBeNull();
        expect(link?.getAttribute('href')).toBe('/api/v1/solutions/demo/proxy/api/items/1/attachments/notes.txt');
        expect(link?.getAttribute('target')).toBe('_blank');
    });

    it('reports an error when the download fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => Promise.reject(new Error('Network unavailable')))
        );
        const container = await renderViewer('<FileViewer src="/api/items/1/attachments/a.pdf" title="Contract" />');

        await vi.waitFor(() => expect(container.textContent).toContain('Preview unavailable'));
        expect(container.querySelector('iframe')).toBeNull();
    });

    it('reports an error without fetching for unsafe sources', async () => {
        const fetchRequest = vi.fn();
        vi.stubGlobal('fetch', fetchRequest);
        const container = await renderViewer('<FileViewer src="javascript:alert(1)" title="Contract" />');

        await vi.waitFor(() => expect(container.textContent).toContain('Preview unavailable'));
        expect(fetchRequest).not.toHaveBeenCalled();
    });

    it('requires a title', () => {
        expect(() => renderXmlToMarkup(parseFragment('<FileViewer src="/files/a.pdf" />'))).toThrow();
    });

    it('resolves per-row sources inside table dialogs', async () => {
        // Arrange
        let requestUrl = '';
        vi.stubGlobal(
            'fetch',
            vi.fn(async (input: RequestInfo | URL) => {
                const url = (input as Request).url;

                if (url.endsWith('/attachments')) {
                    return Response.json([{ id: 'a-report.pdf', name: 'Report' }]);
                }

                requestUrl = url;

                return pdfResponse();
            })
        );
        const ctx = createContext({ requestBaseUrl: '/api/v1/solutions/demo/proxy' });

        // Route params survive renderer setup like production navigation.
        Object.assign(ctx.scope.bindings, { params: { item: '1' } });

        // Act
        const container = await renderViewer(
            '<Query id="attachments" path="/api/items/${params.item}/attachments" /><Table data="$attachments" idKey="id"><TableColumn field="name" header="File"><Dialog title="$row.name" triggerLabel="$row.name" purpose="info"><FileViewer src="/api/items/${params.item}/attachments/${row.id}" title="$row.name" /></Dialog></TableColumn></Table>',
            ctx
        );

        // Assert
        await vi.waitFor(() => expect(container.querySelector('iframe')).not.toBeNull());
        expect(container.querySelector('button')?.textContent).toContain('Report');
        expect(requestUrl).toContain('/api/v1/solutions/demo/proxy/api/items/1/attachments/a-report.pdf');
        expect(container.querySelector('iframe')?.getAttribute('title')).toBe('Report');
    });
});
