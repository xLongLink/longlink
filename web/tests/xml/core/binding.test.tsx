// @vitest-environment happy-dom
import { act } from 'react';
import { RenderXML } from '@/xml/renderers';
import { parseXML } from '@/xml/core/parser';
import { createRoot } from 'react-dom/client';
import { createContext } from '@/xml/core/context';
import { afterEach, describe, expect, it } from 'vitest';

describe('useBindableValue', () => {
    let container: HTMLDivElement | undefined;

    afterEach(() => {
        container?.remove();
        container = undefined;
    });

    it('updates unbound values from reactive State', async () => {
        const ctx = createContext();
        const ast = parseXML(
            '<longlink><State id="form" value="first" /><TextInput label="Name" value="form.value" /></longlink>'
        )[0];
        container = document.createElement('div');
        const root = createRoot(container);

        await act(async () => {
            root.render(<RenderXML ast={ast} ctx={ctx} />);
        });

        const input = container.querySelector('input');
        expect(input?.value).toBe('first');

        await act(async () => {
            (ctx.scope.bindings.form as { value: string }).value = 'second';
            await new Promise((resolve) => setTimeout(resolve));
        });

        expect(input?.value).toBe('second');

        await act(async () => {
            await ctx.services.invalidate('form');
        });

        expect(input?.value).toBe('first');

        await act(async () => root.unmount());
    });
});
