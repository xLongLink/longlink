// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { Disclosure } from '@/components/custom/disclosure';

it('honors an authored initially open disclosure', () => {
    // Act
    const output = renderStatic(
        <Disclosure trigger="Details" defaultIsOpen>
            Order details
        </Disclosure>
    );

    // Assert
    expect(output.querySelector('[aria-expanded="true"]')).not.toBeNull();
    expect(output.textContent).toContain('Order details');
});

it('toggles by keyboard without discarding an entered draft', async () => {
    // Closing a disclosure must hide its fields, not destroy their local form state.
    await withMounted(
        <Disclosure trigger="Details">
            <input aria-label="Draft" />
        </Disclosure>,
        async (output) => {
            const keyboard = userEvent.setup();
            const trigger = output.querySelector<HTMLButtonElement>('button');
            const input = output.querySelector<HTMLInputElement>('input');

            if (!trigger || !input) throw new Error('Expected disclosure controls');
            await act(async () => {
                await keyboard.type(input, 'Unsaved order');
                trigger.focus();
                await keyboard.keyboard('{Enter}');
            });
            expect(trigger.getAttribute('aria-expanded')).toBe('false');
            expect(output.querySelector('[data-slot="collapsible-content"]')?.hasAttribute('hidden')).toBe(true);
            expect(output.querySelector('input')).toBe(input);

            await act(async () => keyboard.keyboard(' '));
            expect(trigger.getAttribute('aria-expanded')).toBe('true');
            expect(input.value).toBe('Unsaved order');
        }
    );
});

it('requests a controlled change without overriding its owner', async () => {
    // A controlled disclosure stays closed until its owner accepts the requested value.
    const changed = vi.fn();
    await withMounted(
        <Disclosure trigger="Details" isOpen={false} onOpenChange={changed}>
            Private details
        </Disclosure>,
        async (output) => {
            const trigger = output.querySelector<HTMLButtonElement>('button');

            if (!trigger) throw new Error('Expected disclosure trigger');
            await act(async () => trigger.click());
            expect(changed).toHaveBeenCalledWith(true);
            expect(trigger.getAttribute('aria-expanded')).toBe('false');
            expect(output.querySelector('[data-slot="collapsible-content"]')?.hasAttribute('hidden')).toBe(true);
        }
    );
});

it('does not activate a disabled disclosure', async () => {
    // Disabled state must prevent activation.
    const changed = vi.fn();
    await withMounted(
        <Disclosure trigger="Details" defaultIsOpen={false} isDisabled onOpenChange={changed}>
            Details
        </Disclosure>,
        async (output) => {
            const trigger = output.querySelector<HTMLButtonElement>('button');

            if (!trigger) throw new Error('Expected disclosure trigger');
            await act(async () => trigger.click());
            expect(trigger.disabled || trigger.getAttribute('aria-disabled') === 'true').toBe(true);
            expect(trigger.getAttribute('aria-expanded')).toBe('false');
            expect(changed).not.toHaveBeenCalled();
        }
    );
});

it('returns focus to the trigger when a focused panel closes', async () => {
    // A close action inside the panel must not strand focus in hidden content.
    function Editor() {
        const [open, setOpen] = useState(true);

        return (
            <Disclosure trigger="Details" isOpen={open} onOpenChange={setOpen}>
                <button type="button" onClick={() => setOpen(false)}>
                    Done
                </button>
            </Disclosure>
        );
    }

    await withMounted(<Editor />, async (output) => {
        const keyboard = userEvent.setup();

        const done = Array.from(output.querySelectorAll<HTMLButtonElement>('button')).find(
            (button) => button.textContent === 'Done'
        );

        const trigger = output.querySelector('[data-slot="collapsible-trigger"]');

        if (!done) throw new Error('Expected editor close action');
        await act(async () => keyboard.click(done));
        expect(document.activeElement).toBe(trigger);
        expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    });
});
