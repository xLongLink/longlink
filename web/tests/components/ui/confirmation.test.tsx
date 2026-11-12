// @vitest-environment happy-dom
import { act } from 'react';
import { expect, it, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { useConfirm } from '@/components/ui/confirmation';
import { ButtonGroupContext, ControlSizeContext } from '@/components/ui/contexts';

it('keeps a destructive operation open while pending, retains failure for retry, and restores the opener after success', async () => {
    let reject!: (error: Error) => void;

    const operation = vi
        .fn()
        .mockImplementationOnce(
            () =>
                new Promise<void>((_, fail) => {
                    reject = fail;
                })
        )
        .mockResolvedValueOnce(undefined);

    /** Runs the real confirmation owner inside an otherwise disabled group. */
    function Probe() {
        const confirm = useConfirm();

        return (
            <ButtonGroupContext value={{ orientation: 'vertical', isDisabled: true }}>
                <ControlSizeContext value="lg">
                    <button
                        type="button"
                        onClick={() =>
                            confirm.show({
                                title: 'Delete order?',
                                actionLabel: 'Delete',
                                actionVariant: 'destructive',
                                onAction: operation,
                            })
                        }
                    >
                        Open
                    </button>
                    {confirm.element}
                </ControlSizeContext>
            </ButtonGroupContext>
        );
    }

    await withMounted(<Probe />, async (output) => {
        const events = userEvent.setup();
        const trigger = output.querySelector('button');

        if (!trigger) throw new Error('Missing opener');

        await act(async () => events.click(trigger));
        const modal = document.querySelector('[role="alertdialog"]');

        if (!modal) throw new Error('Missing confirmation');

        const [cancel, action] = modal.querySelectorAll('button');

        if (!cancel) throw new Error('Missing cancel button');

        expect(document.activeElement).toBe(cancel);
        await act(async () => events.click(cancel));
        expect(operation).not.toHaveBeenCalled();
        expect(document.querySelector('[role="alertdialog"]')).toBeNull();
        expect(document.activeElement).toBe(trigger);
        await act(async () => events.click(trigger));
        const submit = document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')[1];

        if (!submit) throw new Error('Missing submit button');

        await act(async () => events.click(submit));
        expect(document.activeElement).toBe(submit);
        expect(submit.getAttribute('aria-disabled')).toBe('true');
        expect(submit.getAttribute('aria-label')).toBe('Delete');
        await act(async () => events.keyboard('{Escape}'));
        expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
        expect(document.activeElement).toBe(submit);
        await act(async () => events.tab({ shift: true }));
        const pendingCancel = document.querySelector<HTMLButtonElement>('[role="alertdialog"] button');

        if (!pendingCancel) throw new Error('Missing pending cancel button');

        expect(document.activeElement).toBe(pendingCancel);
        expect(pendingCancel.getAttribute('aria-disabled')).toBe('true');
        await act(async () => events.keyboard('{Enter} {Escape}'));
        await act(async () => events.click(pendingCancel));
        expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
        await act(async () => events.tab());
        expect(document.activeElement).toBe(submit);
        await act(async () => events.keyboard('{Enter} '));
        expect(operation).toHaveBeenCalledTimes(1);
        await act(async () => reject(new Error('Could not delete the order')));
        expect(document.querySelector('[role="alert"]')?.textContent).toBe('Could not delete the order');
        expect(submit.getAttribute('aria-disabled')).not.toBe('true');
        expect(document.activeElement).toBe(submit);
        await act(async () => events.click(submit));
        expect(operation).toHaveBeenCalledTimes(2);
        expect(document.querySelector('[role="alertdialog"]')).toBeNull();
        expect(document.activeElement).toBe(trigger);
        expect(action?.textContent).toBe('Delete');
    });
});
