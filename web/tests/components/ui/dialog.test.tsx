// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { Dialog } from '@/components/longlink/layout/dialog';
import { DialogActivityContext } from '@/lib/view-capabilities';
import { Dropdown, DropdownItem, DropdownContent, DropdownTrigger } from '@/components/longlink/action/dropdown';

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
