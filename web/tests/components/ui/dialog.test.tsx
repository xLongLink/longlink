// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { ViewDialog } from '@/components/custom/view-dialog';
import { ButtonGroupContext, ControlSizeContext, DialogActivityContext } from '@/components/custom/contexts';
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuContent,
    DropdownMenuTrigger
} from '@/components/shadcn/dropdown-menu';

it('dismisses the custom Dialog without submitting its form', async () => {
    // Arrange
    const close = vi.fn();

    // Act
    await withMounted(<ViewDialog isOpen onOpenChange={close} />, async () => {
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
                    <ViewDialog title="Edit order" isOpen onOpenChange={change}>
                        Draft
                    </ViewDialog>
                )}
            </>
        );
    }

    // Act
    await withMounted(<Probe />, async (output) => {
        // Assert the dialog can render before removing it.
        expect(document.querySelector('[role="dialog"]')).not.toBeNull();

        // Hide the dialog without changing its controlled open state.
        const hide = output.querySelector('button');

        if (!hide) throw new Error('Expected the visibility toggle');

        await act(async () => hide.click());

        // Assert
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(change).not.toHaveBeenCalled();
    });
});

it('traps keyboard focus, ignores backdrop presses, and restores focus after Escape from a disabled group', async () => {
    const activity = vi.fn();

    /** Opens a controlled modal from an independently operable trigger. */
    function Probe() {
        const [open, setOpen] = useState(false);

        return (
            <DialogActivityContext value={activity}>
                <button type="button" onClick={() => setOpen(true)}>
                    Edit
                </button>
                <ButtonGroupContext value={{ orientation: 'vertical', isDisabled: true }}>
                    <ControlSizeContext value="lg">
                        <ViewDialog title="Edit order" isOpen={open} onOpenChange={setOpen}>
                            <input aria-label="Order name" />
                        </ViewDialog>
                    </ControlSizeContext>
                </ButtonGroupContext>
            </DialogActivityContext>
        );
    }

    await withMounted(<Probe />, async (output) => {
        const events = userEvent.setup();
        const trigger = output.querySelector('button');

        if (!trigger) throw new Error('Missing opener');

        await act(async () => events.click(trigger));
        const modal = document.querySelector('[role="dialog"]');

        if (!modal) throw new Error('Missing modal');

        const close = modal.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]');

        if (!close) throw new Error('Missing close button');

        const title = document.getElementById(modal.getAttribute('aria-labelledby') ?? '');

        if (!title) throw new Error('Missing accessible title');

        expect(title.textContent).toBe('Edit order');
        expect(document.activeElement).toBe(title);
        expect(close.disabled).toBe(false);
        expect(close.getAttribute('aria-disabled')).not.toBe('true');
        const backdrop = document.querySelector('[data-slot="dialog-overlay"]');

        if (!backdrop) throw new Error('Missing backdrop');

        await act(async () => events.click(backdrop));
        expect(document.querySelector('[role="dialog"]')).not.toBeNull();
        await act(async () => close.focus());
        await act(async () => events.tab({ shift: true }));
        expect(document.activeElement).toBe(modal.querySelector('input'));
        await act(async () => events.tab());
        expect(document.activeElement).toBe(close);
        await act(async () => events.keyboard('{Escape}'));
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(document.activeElement).toBe(trigger);
        expect(activity.mock.calls).toEqual([
            [true, false],
            [false, false]
        ]);
    });
});

it('cleans up sandbox fullscreen coordination when the open modal unmounts', async () => {
    const activity = vi.fn();

    await withMounted(
        <DialogActivityContext value={activity}>
            <ViewDialog title="Preview" variant="fullscreen" isOpen onOpenChange={() => {}} />
        </DialogActivityContext>,
        async () => {
            expect(activity).toHaveBeenCalledExactlyOnceWith(true, true);
        }
    );
    expect(activity.mock.calls).toEqual([
        [true, true],
        [false, true]
    ]);
});

it('keeps a portaled menu operable inside the modal and dismisses the innermost layer first', async () => {
    const action = vi.fn();
    const user = userEvent.setup();

    function Probe() {
        const [open, setOpen] = useState(true);

        return (
            <ViewDialog title="Actions" isOpen={open} onOpenChange={setOpen}>
                <DropdownMenu>
                    <DropdownMenuTrigger>More</DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={action}>Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </ViewDialog>
        );
    }

    await withMounted(<Probe />, async () => {
        const trigger = document.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]');

        if (!trigger) throw new Error('Expected the modal menu trigger');
        await act(async () => user.click(trigger));
        await act(async () => user.keyboard('{ArrowDown}{Enter}'));
        expect(action).toHaveBeenCalledTimes(1);
        expect(document.querySelector('[role="menu"]')).toBeNull();
        expect(document.querySelector('[role="dialog"]')).not.toBeNull();
        expect(document.activeElement).toBe(trigger);

        await act(async () => user.click(trigger));
        await act(async () => user.keyboard('{Escape}'));
        expect(document.querySelector('[role="menu"]')).toBeNull();
        expect(document.querySelector('[role="dialog"]')).not.toBeNull();
        expect(document.activeElement).toBe(trigger);
        await act(async () => user.keyboard('{Escape}'));
        expect(document.querySelector('[role="dialog"]')).toBeNull();
    });
});
