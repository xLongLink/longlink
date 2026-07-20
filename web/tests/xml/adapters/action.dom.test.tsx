import { act } from 'react';
import { expect, it } from 'bun:test';
import { createRoot } from 'react-dom/client';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { parseXML } from '@/xml/core/parser';
import { RenderXML } from '@/xml/renderers.tsx';
import { withGlobalValue } from '../../helpers/globals';

type CapturedRequest = {
    input: RequestInfo | URL;
    init?: RequestInit;
};

/* Bound input edits should reach Action JSON through the mounted XML runtime. */
it('sends the latest bound input value when its action button is clicked', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    let captureRequest: (request: CapturedRequest) => void = () => {};
    const requestPromise = new Promise<CapturedRequest>((resolve) => {
        captureRequest = resolve;
    });
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
        captureRequest({ input, init });

        return new Response(null, { status: 204 });
    };

    document.body.append(container);

    try {
        await withGlobalValue('fetch', fetchImpl, async () => {
            const ast = parseXML(
                '<longlink><State id="form" name="Ada Lovelace" /><TextInput label="Name" value="$form.name" /><Action action="/profiles" json="${{ name: form.name }}"><Button label="Save" /></Action></longlink>'
            );

            // Mount the parsed page and wait for State setup to publish the interactive controls.
            await act(async () => {
                root.render(
                    <LayerProvider>
                        <RenderXML ast={ast} />
                    </LayerProvider>
                );
            });

            const input = container.querySelector('input');
            const button = container.querySelector('button');

            if (!input || !button) throw new Error('Expected the XML runtime to render an input and button');

            const setInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

            if (!setInputValue) throw new Error('Expected the DOM input value setter');

            // Drive React's real input event path so the Valtio-backed binding receives the edit.
            await act(async () => {
                setInputValue.call(input, 'Grace Hopper');
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });

            // Click the rendered adapter button and wait for production request code to capture the payload.
            await act(async () => {
                button.click();
            });
            const request = await requestPromise;

            expect(String(request.input)).toBe('/profiles');
            expect(request.init?.body).toBe(JSON.stringify({ name: 'Grace Hopper' }));
            expect(new Headers(request.init?.headers).get('content-type')).toBe('application/json');
        });
    } finally {
        await act(async () => {
            root.unmount();
        });
        container.remove();
    }
});
