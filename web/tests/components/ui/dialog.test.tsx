// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { DialogActivityContext } from '@/views/contexts';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Dropdown, DropdownItem, DropdownContent, DropdownTrigger } from '@/components/longlink/action/dropdown';

it('closes a dialog without submitting its form', async () => {
    const close = vi.fn();
    const submit = vi.fn((event: React.SubmitEvent) => event.preventDefault());
    const activity = vi.fn();
    const user = userEvent.setup();

    // Keep visibility caller-owned while exercising the modal close control.
    await withMounted(
        <DialogActivityContext value={activity}>
            <Dialog title="Edit order" fullscreen open onOpenChange={close}>
                <form onSubmit={submit}>
                    <input aria-label="Order name" />
                </form>
            </Dialog>
        </DialogActivityContext>,
        async () => {
            const button = document.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]');

            if (!button) throw new Error('Missing close button');

            await act(async () => user.click(button));
            expect(close).toHaveBeenCalledTimes(1);
            expect(close.mock.calls[0]?.[0]).toBe(false);
            expect(submit).not.toHaveBeenCalled();
            expect(activity).toHaveBeenCalledExactlyOnceWith(true);
        }
    );
    expect(activity).toHaveBeenLastCalledWith(false);
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
                    <Dialog title="Edit order" open onOpenChange={change}>
                        Draft
                    </Dialog>
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
                <Dialog
                    title="Edit order"
                    open={open}
                    onOpenChange={(nextOpen, details) => {
                        if (details.reason === 'outside-press') details.cancel();
                        else setOpen(nextOpen);
                    }}
                >
                    <input aria-label="Order name" />
                </Dialog>
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
        expect(activity.mock.calls).toEqual([[true], [false]]);
    });
});

it('keeps a portaled menu operable inside the modal and dismisses the innermost layer first', async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    const overrides = { className: 'hidden' };

    function Probe() {
        const [open, setOpen] = useState(true);

        return (
            <Dialog title="Actions" open={open} onOpenChange={setOpen}>
                <Dropdown>
                    <DropdownTrigger {...overrides}>More</DropdownTrigger>
                    <DropdownContent {...overrides}>
                        <DropdownItem {...overrides} onClick={action}>
                            Archive
                        </DropdownItem>
                    </DropdownContent>
                </Dropdown>
            </Dialog>
        );
    }

    await withMounted(<Probe />, async () => {
        const trigger = document.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]');

        if (!trigger) throw new Error('Expected the modal menu trigger');
        expect(trigger.classList.contains('hidden')).toBe(false);
        await act(async () => user.click(trigger));
        expect(document.querySelector('[role="menu"]')?.classList.contains('hidden')).toBe(false);
        expect(document.querySelector('[role="menuitem"]')?.classList.contains('hidden')).toBe(false);
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
            <Dialog title="Order" defaultOpen>
                <Dialog title="Attachment" fullscreen trigger={<button type="button">Preview attachment</button>} />
            </Dialog>
        </DialogActivityContext>,
        async () => {
            const trigger = document.querySelector<HTMLButtonElement>('[data-slot="dialog-trigger"]');

            if (!trigger) throw new Error('Missing nested dialog trigger');
            await act(async () => user.click(trigger));
            expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(2);
            expect(activity.mock.calls).toEqual([[true], [true]]);

            await act(async () => user.keyboard('{Escape}'));
            expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
            expect(activity.mock.calls).toEqual([[true], [true], [false]]);
            expect(document.activeElement).toBe(trigger);

            await act(async () => user.keyboard('{Escape}'));
            expect(document.querySelector('[role="dialog"]')).toBeNull();
            expect(activity).toHaveBeenLastCalledWith(false);
        }
    );
});
