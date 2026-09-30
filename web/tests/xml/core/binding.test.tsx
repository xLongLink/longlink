// @vitest-environment happy-dom
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContext, cleanupMountedRoot, mountXml } from '../helpers';

describe('useBindableValue', () => {
    let mounted: Awaited<ReturnType<typeof mountXml>> | undefined;

    afterEach(async () => {
        await cleanupMountedRoot(mounted?.root);
        mounted?.container.remove();
        vi.unstubAllGlobals();
        mounted = undefined;
    });

    it('updates unbound values from reactive State', async () => {
        const ctx = createContext();
        mounted = await mountXml('<State id="form" value="first" /><TextInput label="Name" value="form.value" />', ctx);

        const input = mounted.container.querySelector('input');
        expect(input?.value).toBe('first');

        await act(async () => {
            (ctx.scope.bindings.form as { value: string }).value = 'second';
        });

        expect(input?.value).toBe('second');

        await act(async () => {
            await ctx.services.invalidate('form');
        });

        expect(input?.value).toBe('first');
    });

    it('writes TextInput values to bound State', async () => {
        const ctx = createContext();
        mounted = await mountXml(
            '<State id="form" value="first" /><TextInput label="Name" value="$form.value" />',
            ctx,
            true
        );

        const input = mounted.container.querySelector('input');
        if (!input) throw new Error('TextInput did not render');

        const user = userEvent.setup();

        // Commit the Valtio-driven controlled value before the next keystroke reads it.
        await act(async () => user.clear(input));
        for (const character of 'second') {
            await act(async () => user.keyboard(character));
        }

        expect((ctx.scope.bindings.form as { value: string }).value).toBe('second');
        expect(input.value).toBe('second');
    });

    it('rejects unsafe writable binding paths', async () => {
        // Arrange
        const ctx = createContext();

        // Act
        mounted = await mountXml(
            '<State id="form" value="first" /><TextInput label="Name" value="$form.__proto__" />',
            ctx
        );

        // Assert
        expect(mounted.container.textContent).toContain('XML binding path must use safe property names');
    });

    it('shows failed asynchronous Query setup errors without rendering children', async () => {
        vi.stubGlobal(
            'fetch',
            async () => new Response(JSON.stringify({ detail: 'Records unavailable' }), { status: 503 })
        );

        mounted = await mountXml('<Query id="records" path="/records" /><Text>Loaded child</Text>');

        expect(mounted.container.textContent).toContain('Unable to initialize this view');
        expect(mounted.container.textContent).not.toContain('Loaded child');
    });

    it('rejects an invalid Query setup before fetching', async () => {
        // Arrange
        const fetchImpl = vi.fn();
        vi.stubGlobal('fetch', fetchImpl);

        // Act
        mounted = await mountXml('<Query id="records" />');

        // Assert
        expect(mounted.container.textContent).toContain('Unable to initialize this view');
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});
