// @vitest-environment happy-dom
import { act } from 'react';
import { RenderXML } from '@/xml/renderers';
import { parseXML } from '@/xml/core/parser';
import { createRoot } from 'react-dom/client';
import { createContext } from '@/xml/core/context';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('useBindableValue', () => {
    let container: HTMLDivElement | undefined;
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(() => {
        if (root) {
            const renderedRoot = root;
            act(() => renderedRoot.unmount());
        }
        container?.remove();
        vi.unstubAllGlobals();
        container = undefined;
        root = undefined;
    });

    it('updates unbound values from reactive State', async () => {
        const ctx = createContext();
        const ast = parseXML(
            '<longlink><State id="form" value="first" /><TextInput label="Name" value="form.value" /></longlink>'
        )[0];
        container = document.createElement('div');
        root = createRoot(container);

        await act(async () => {
            root?.render(<RenderXML ast={ast} ctx={ctx} />);
        });

        const input = container.querySelector('input');
        expect(input?.value).toBe('first');

        await act(async () => {
            (ctx.scope.bindings.form as { value: string }).value = 'second';
        });

        await act(async () => {
            await vi.waitFor(() => expect(input?.value).toBe('second'));
        });

        await act(async () => {
            await ctx.services.invalidate('form');
        });

        expect(input?.value).toBe('first');
    });

    it('writes TextInput values to bound State', async () => {
        const ctx = createContext();
        const ast = parseXML(
            '<longlink><State id="form" value="first" /><TextInput label="Name" value="$form.value" /></longlink>'
        )[0];
        container = document.createElement('div');
        document.body.append(container);
        root = createRoot(container);
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

        await act(async () => {
            root?.render(<RenderXML ast={ast} ctx={ctx} />);
        });

        const input = container.querySelector('input');
        if (!input) throw new Error('TextInput did not render');

        const user = userEvent.setup();
        await user.clear(input);
        await user.type(input, 'second');

        expect((ctx.scope.bindings.form as { value: string }).value).toBe('second');
    });

    it('shows failed asynchronous Query setup errors without rendering children', async () => {
        const ctx = createContext();
        const ast = parseXML('<longlink><Query id="records" path="/records" /><Text>Loaded child</Text></longlink>')[0];
        const output = document.createElement('div');
        container = output;
        root = createRoot(output);
        vi.stubGlobal(
            'fetch',
            async () => new Response(JSON.stringify({ detail: 'Records unavailable' }), { status: 503 })
        );

        await act(async () => {
            root?.render(<RenderXML ast={ast} ctx={ctx} />);
        });

        await act(async () => {
            await vi.waitFor(() => expect(output.textContent).toContain('Records unavailable'));
        });

        expect(output.textContent).not.toContain('Loaded child');
    });

    it('rejects an invalid Query setup before fetching', async () => {
        // Arrange
        const ctx = createContext();
        const ast = parseXML('<longlink><Query id="records" /></longlink>')[0];
        const fetchImpl = vi.fn();
        container = document.createElement('div');
        root = createRoot(container);
        vi.stubGlobal('fetch', fetchImpl);

        // Act
        await act(async () => {
            root?.render(<RenderXML ast={ast} ctx={ctx} />);
        });

        // Assert
        expect(container.textContent).toContain('Query requires a string path');
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});
