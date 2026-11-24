// @vitest-environment happy-dom
import { act, useState } from 'react';
import { expect, it, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { useConfirm } from '@/components/longlink/hooks/use-confirm';

it('keeps keyboard focus usable during a pending destructive confirmation and restores the opener', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
        finish = resolve;
    });
    const operation = vi.fn(() => pending);

    /** Runs the real confirmation owner. */
    function Probe() {
        const confirm = useConfirm();

        return (
            <>
                <button
                    type="button"
                    onClick={() =>
                        confirm.show({
                            title: 'Delete order?',
                            actionLabel: 'Delete',
                            actionVariant: 'destructive',
                            onAction: operation
                        })
                    }
                >
                    Open
                </button>
                {confirm.element}
            </>
        );
    }

    await withMounted(<Probe />, async (output) => {
        const events = userEvent.setup();
        const trigger = output.querySelector('button');

        if (!trigger) throw new Error('Missing opener');

        await act(async () => events.click(trigger));
        const modal = document.querySelector('[role="alertdialog"]');

        if (!modal) throw new Error('Missing confirmation');

        const [cancel] = modal.querySelectorAll('button');

        if (!cancel) throw new Error('Missing cancel button');

        expect(document.activeElement).toBe(cancel);
        const submit = modal.querySelectorAll('button')[1];

        if (!submit) throw new Error('Missing submit button');

        await act(async () => events.click(submit));
        expect(document.activeElement).toBe(submit);
        expect(submit.getAttribute('aria-disabled')).toBe('true');
        await act(async () => events.keyboard('{Escape}'));
        expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
        await act(async () => events.tab({ shift: true }));

        expect(document.activeElement).toBe(cancel);
        expect(cancel.getAttribute('aria-disabled')).toBe('true');
        await act(async () => events.keyboard('{Enter}'));
        expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
        await act(async () => events.tab());
        expect(document.activeElement).toBe(submit);
        await act(async () => events.keyboard('{Enter} '));
        expect(operation).toHaveBeenCalledOnce();
        await act(async () => finish());
        expect(document.querySelector('[role="alertdialog"]')).toBeNull();
        expect(document.activeElement).toBe(trigger);
    });
});

it('retains synchronous failures for retry and commits caller state while the retry is pending', async () => {
    // Arrange
    let finish = () => {};
    const pending = new Promise<void>((resolve) => {
        finish = resolve;
    });
    const operation = vi
        .fn<() => Promise<void>>()
        .mockImplementationOnce(() => {
            throw new Error('Try again');
        })
        .mockReturnValue(pending);

    function Probe() {
        const confirm = useConfirm();
        const [attempts, setAttempts] = useState(0);

        return (
            <>
                <output>{attempts}</output>
                <button
                    onClick={() =>
                        confirm.show({
                            title: 'Delete order?',
                            actionLabel: 'Delete',
                            onAction: () => {
                                setAttempts((count) => count + 1);

                                return operation();
                            }
                        })
                    }
                >
                    Open
                </button>
                {confirm.element}
            </>
        );
    }

    try {
        await withMounted(<Probe />, async (output) => {
            await act(async () => output.querySelector('button')?.click());
            const dialog = document.querySelector('[role="alertdialog"]');
            const submit = dialog?.querySelectorAll('button')[1];
            if (!submit) throw new Error('Missing submit button');

            // Act
            await act(async () => submit.click());

            // Assert
            expect(dialog?.textContent).toContain('Try again');
            expect(submit.hasAttribute('aria-busy')).toBe(false);

            await act(async () => {
                submit.click();
                submit.click();
            });
            expect(operation).toHaveBeenCalledTimes(2);
            expect(dialog?.textContent).not.toContain('Try again');
            expect(output.querySelector('output')?.textContent).toBe('2');
            expect(submit.getAttribute('aria-busy')).toBe('true');

            await act(async () => finish());
            expect(document.querySelector('[role="alertdialog"]')).toBeNull();
        });
    } finally {
        finish();
    }
});
