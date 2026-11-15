// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { DialogActivityContext } from '@/components/custom/contexts';
import { Dialog as NativeDialog } from '@/components/custom/native-dialog';
import { DialogTrigger, DialogContent, DialogTitle, DialogClose } from '@/components/shadcn/dialog';
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuContent,
    DropdownMenuTrigger
} from '@/components/shadcn/dropdown-menu';

it.each([false, true])('closes a dialog without submitting its form (fullscreen host: %s)', async (fullscreen) => {
    const close = vi.fn();
    const submit = vi.fn((event: React.SubmitEvent) => event.preventDefault());
    const activity = vi.fn();
    const user = userEvent.setup();

    // Keep visibility caller-owned while exercising the modal close control.
    await withMounted(
        <DialogActivityContext value={activity}>
            <NativeDialog fullscreen={fullscreen} open onOpenChange={close}>
                <DialogContent>
                    <DialogTitle>Edit order</DialogTitle>
                    <form onSubmit={submit}>
                        <input aria-label="Order name" />
                    </form>
                </DialogContent>
            </NativeDialog>
        </DialogActivityContext>,
        async () => {
            const button = document.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]');

            if (!button) throw new Error('Missing close button');

            await act(async () => user.click(button));
            expect(close).toHaveBeenCalledTimes(1);
            expect(close.mock.calls[0]?.[0]).toBe(false);
            expect(submit).not.toHaveBeenCalled();
            expect(activity).toHaveBeenCalledExactlyOnceWith(true, fullscreen);
        }
    );
    expect(activity).toHaveBeenLastCalledWith(false, fullscreen);
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
                    <NativeDialog open onOpenChange={change}>
                        <DialogContent>
                            <DialogTitle>Edit order</DialogTitle>
                            Draft
                        </DialogContent>
                    </NativeDialog>
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

it('traps keyboard focus, ignores backdrop presses, and restores focus after Escape', async () => {
    const activity = vi.fn();

    /** Opens a controlled modal from an independently operable trigger. */
    function Probe() {
        const [open, setOpen] = useState(false);

        return (
            <DialogActivityContext value={activity}>
                <button type="button" onClick={() => setOpen(true)}>
                    Edit
                </button>
                <NativeDialog disablePointerDismissal open={open} onOpenChange={setOpen}>
                    <DialogContent>
                        <DialogTitle>Edit order</DialogTitle>
                        <input aria-label="Order name" />
                    </DialogContent>
                </NativeDialog>
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

        const close = modal.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]');

        if (!close) throw new Error('Missing close button');

        const title = document.getElementById(modal.getAttribute('aria-labelledby') ?? '');

        if (!title) throw new Error('Missing accessible title');

        expect(title.textContent).toBe('Edit order');
        expect(document.activeElement).toBe(modal.querySelector('input'));
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
            <NativeDialog fullscreen open onOpenChange={() => {}}>
                <DialogContent>
                    <DialogTitle>Preview</DialogTitle>
                </DialogContent>
            </NativeDialog>
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

it('keeps native dialog host coordination active after canceled dismissal and releases it on close', async () => {
    const activity = vi.fn();
    const user = userEvent.setup();

    // Keep Escape canceled while allowing an explicit close action.
    await withMounted(
        <DialogActivityContext value={activity}>
            <NativeDialog
                onOpenChange={(_open, details) => {
                    if (details.reason === 'escape-key') details.cancel();
                }}
            >
                <DialogTrigger>Open</DialogTrigger>
                <DialogContent showCloseButton={false}>
                    <DialogTitle>Order details</DialogTitle>
                    <DialogClose>Done</DialogClose>
                </DialogContent>
            </NativeDialog>
        </DialogActivityContext>,
        async (output) => {
            const trigger = output.querySelector('button');

            if (!trigger) throw new Error('Missing dialog trigger');

            await act(async () => user.click(trigger));
            expect(activity.mock.calls).toEqual([[true, false]]);

            await act(async () => user.keyboard('{Escape}'));
            expect(document.querySelector('[role="dialog"]')).not.toBeNull();
            expect(activity.mock.calls).toEqual([[true, false]]);

            const close = document.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]');

            if (!close) throw new Error('Missing dialog close');

            await act(async () => user.click(close));
            expect(document.querySelector('[role="dialog"]')).toBeNull();
            expect(activity.mock.calls).toEqual([
                [true, false],
                [false, false]
            ]);
            expect(document.activeElement).toBe(trigger);
        }
    );
});

it('keeps a portaled menu operable inside the modal and dismisses the innermost layer first', async () => {
    const action = vi.fn();
    const user = userEvent.setup();

    function Probe() {
        const [open, setOpen] = useState(true);

        return (
            <NativeDialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogTitle>Actions</DialogTitle>
                    <DropdownMenu>
                        <DropdownMenuTrigger>More</DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={action}>Archive</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </DialogContent>
            </NativeDialog>
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

it('releases only the dismissed nested dialog host capability and restores focus to its trigger', async () => {
    const activity = vi.fn();
    const user = userEvent.setup();

    await withMounted(
        <DialogActivityContext value={activity}>
            <NativeDialog defaultOpen>
                <DialogContent>
                    <DialogTitle>Order</DialogTitle>
                    <NativeDialog fullscreen>
                        <DialogTrigger>Preview attachment</DialogTrigger>
                        <DialogContent>
                            <DialogTitle>Attachment</DialogTitle>
                        </DialogContent>
                    </NativeDialog>
                </DialogContent>
            </NativeDialog>
        </DialogActivityContext>,
        async () => {
            const trigger = document.querySelector<HTMLButtonElement>('[data-slot="dialog-trigger"]');

            if (!trigger) throw new Error('Missing nested dialog trigger');
            await act(async () => user.click(trigger));
            expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(2);
            expect(activity.mock.calls).toEqual([
                [true, false],
                [true, true]
            ]);

            await act(async () => user.keyboard('{Escape}'));
            expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
            expect(activity.mock.calls).toEqual([
                [true, false],
                [true, true],
                [false, true]
            ]);
            expect(document.activeElement).toBe(trigger);

            await act(async () => user.keyboard('{Escape}'));
            expect(document.querySelector('[role="dialog"]')).toBeNull();
            expect(activity).toHaveBeenLastCalledWith(false, false);
        }
    );
});
