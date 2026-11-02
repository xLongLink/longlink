// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { Dialog } from '@/components/ui/Dialog';

it('invokes caller-owned dismissal without submitting a form', async () => {
    // Arrange
    const close = vi.fn();

    // Act
    await withMounted(<Dialog isOpen onOpenChange={close} />, async () => {
        const button = document.querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]');
        await act(async () => button?.click());

        // Assert
        expect(close).toHaveBeenCalledExactlyOnceWith(false);
        expect(button?.getAttribute('type')).toBe('button');
    });
});

it('conditionally unmounts an open dialog without changing caller-owned state', async () => {
    // Arrange
    const change = vi.fn();

    /** Toggle rendering without changing the caller's open state. */
    function Probe() {
        const [hidden, setHidden] = useState(false);

        return (
            <>
                <button type="button" onClick={() => setHidden(true)}>
                    Hide
                </button>
                {!hidden && (
                    <Dialog title="Edit order" isOpen onOpenChange={change}>
                        Draft
                    </Dialog>
                )}
            </>
        );
    }

    // Act
    await withMounted(<Probe />, async (output) => {
        // Assert the dialog can render before removing it.
        expect(document.querySelector('dialog[open]')).not.toBeNull();

        // Hide the dialog without changing its controlled open state.
        const hide = output.querySelector('button');

        if (!hide) throw new Error('Expected the visibility toggle');

        await act(async () => hide.click());

        // Assert
        expect(document.querySelector('dialog[open]')).toBeNull();
        expect(change).not.toHaveBeenCalled();
    });
});
