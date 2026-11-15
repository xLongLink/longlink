// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { FramedDialog } from '@/components/custom/framed-dialog';
import { Dialog as NativeDialog } from '@/components/custom/native-dialog';
import { ControlSizeContext, DialogActivityContext } from '@/components/custom/contexts';
import { DialogTrigger, DialogContent, DialogTitle, DialogClose } from '@/components/shadcn/dialog';
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuContent,
    DropdownMenuTrigger
} from '@/components/shadcn/dropdown-menu';

it.each([undefined, 'fullscreen'] as const)(
    'dismisses a standard dialog in %s mode without submitting its form',
    async (variant) => {
        const close = vi.fn();
        const submit = vi.fn((event: React.SubmitEvent) => event.preventDefault());
        const activity = vi.fn();
        const user = userEvent.setup();

        // Keep visibility caller-owned while exercising the modal close control.
        await withMounted(
            <DialogActivityContext value={activity}>
                <FramedDialog title="Edit order" variant={variant} open onOpenChange={close}>
                    <form onSubmit={submit}>
                        <input aria-label="Order name" />
                    </form>
                </FramedDialog>
            </DialogActivityContext>,
            async () => {
                const button = document.querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]');

                if (!button) throw new Error('Missing close button');

                await act(async () => user.click(button));
                expect(close).toHaveBeenCalledExactlyOnceWith(false);
                expect(submit).not.toHaveBeenCalled();
                expect(activity).toHaveBeenCalledExactlyOnceWith(true, variant === 'fullscreen');
            }
        );
        expect(activity).toHaveBeenLastCalledWith(false, variant === 'fullscreen');
    }
);

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
                    <FramedDialog title="Edit order" open onOpenChange={change}>
                        Draft
                    </FramedDialog>
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
                <ControlSizeContext value="lg">
                    <FramedDialog title="Edit order" open={open} onOpenChange={setOpen}>
                        <input aria-label="Order name" />
                    </FramedDialog>
                </ControlSizeContext>
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
            <FramedDialog title="Preview" variant="fullscreen" open onOpenChange={() => {}} />
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
            <FramedDialog title="Actions" open={open} onOpenChange={setOpen}>
                <DropdownMenu>
                    <DropdownMenuTrigger>More</DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={action}>Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </FramedDialog>
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
