// @vitest-environment happy-dom
import { act } from 'react';
import { parseXML } from '@/xml/core/parser';
import { createRoot } from 'react-dom/client';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContext, RenderXML, cleanupMountedRoot } from '../helpers';

/** Returns a State binding with the string value used by this suite. */
function formState(bindings: Record<string, unknown>): { value: string } {
    const form = bindings.form;
    if (!hasStringValue(form)) {
        throw new Error('Form State is missing its string value');
    }

    return form;
}

/** Narrows an unknown State binding to the mutable string shape used by this suite. */
function hasStringValue(value: unknown): value is { value: string } {
    return typeof value === 'object' && value !== null && 'value' in value && typeof value.value === 'string';
}

describe('useBindableValue', () => {
    let container: HTMLDivElement | undefined;
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(async () => {
        await cleanupMountedRoot(root);
        container?.remove();
        vi.unstubAllGlobals();
        container = undefined;
        root = undefined;
    });

    it('updates unbound values from reactive State', async () => {
        const ctx = createContext();
        const ast = parseXML(
            '<longlink><State id="form" value="first" /><TextInput label="Name" value="form.value" /></longlink>'
        );
        container = document.createElement('div');
        root = createRoot(container);

        await act(async () => {
            root?.render(<RenderXML ast={ast} ctx={ctx} />);
        });

        const input = container.querySelector('input');
        expect(input?.value).toBe('first');

        await act(async () => {
            formState(ctx.scope.bindings).value = 'second';
        });

        expect(input?.value).toBe('second');

        await act(async () => {
            await ctx.services.invalidate('form');
        });

        expect(input?.value).toBe('first');
    });

    it('writes TextInput values to bound State', async () => {
        const ctx = createContext();
        const ast = parseXML(
            '<longlink><State id="form" value="first" /><TextInput label="Name" value="$form.value" /></longlink>'
        );
        container = document.createElement('div');
        document.body.append(container);
        root = createRoot(container);
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

        await act(async () => {
            root?.render(<RenderXML ast={ast} ctx={ctx} />);
        });

        const input = container.querySelector('input');
        if (input === null) throw new Error('TextInput did not render');

        const user = userEvent.setup();

        // Commit the Valtio-driven controlled value before the next keystroke reads it.
        await act(async () => user.clear(input));
        for (const character of 'second') {
            await act(async () => user.keyboard(character));
        }

        expect(formState(ctx.scope.bindings).value).toBe('second');
        expect(input.value).toBe('second');
    });

    it('rejects unsafe writable binding paths', async () => {
        // Arrange
        const ctx = createContext();
        const ast = parseXML(
            '<longlink><State id="form" value="first" /><TextInput label="Name" value="$form.__proto__" /></longlink>'
        );
        container = document.createElement('div');
        root = createRoot(container);

        // Act
        await act(async () => {
            root?.render(<RenderXML ast={ast} ctx={ctx} />);
        });

        // Assert
        expect(container.textContent).toContain('XML binding path must use safe property names');
    });

    it('shows failed asynchronous Query setup errors without rendering children', async () => {
        const ctx = createContext();
        const ast = parseXML('<longlink><Query id="records" path="/records" /><Text>Loaded child</Text></longlink>');
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

        expect(output.textContent).toContain('Unable to initialize this view');
        expect(output.textContent).not.toContain('Loaded child');
    });

    it('rejects an invalid Query setup before fetching', async () => {
        // Arrange
        const ctx = createContext();
        const ast = parseXML('<longlink><Query id="records" /></longlink>');
        const fetchImpl = vi.fn();
        container = document.createElement('div');
        root = createRoot(container);
        vi.stubGlobal('fetch', fetchImpl);

        // Act
        await act(async () => {
            root?.render(<RenderXML ast={ast} ctx={ctx} />);
        });

        // Assert
        expect(container.textContent).toContain('Unable to initialize this view');
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});
