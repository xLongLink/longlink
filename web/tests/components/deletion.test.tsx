import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import { renderPlatform } from '../platform/render';
import userEvent from '@testing-library/user-event';
// @vitest-environment happy-dom
import { act, useState, useTransition } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { DeletionDialog } from '@/components/deletion';

it('does not invent a confirmation or action when no resource is selected', () => {
    // Act
    const output = renderPlatform(<DeletionDialog confirmation={null} onClose={() => undefined} />);

    // Assert
    expect(output.querySelector('[role="alertdialog"]')).toBeNull();
    expect(output.textContent).toBe('');
});

it('deduplicates same-tick deletion and allows another deletion after completion', async () => {
    // Arrange
    let finishFirst: () => void = () => undefined;
    let finishSecond: () => void = () => undefined;

    const firstDeletion = new Promise<void>((resolve) => {
        finishFirst = resolve;
    });

    const secondDeletion = new Promise<void>((resolve) => {
        finishSecond = resolve;
    });

    const onDelete = vi
        .fn<() => Promise<void>>()
        .mockReturnValueOnce(firstDeletion)
        .mockReturnValueOnce(secondDeletion);

    await withMounted(
        <DeletionDialog
            confirmation={{ title: 'Delete registry', description: 'Remove this registry connection?', onDelete }}
            onClose={() => undefined}
        />,
        async () => {
            const dialog = document.querySelector('[role="alertdialog"]');

            const confirm = Array.from(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(
                (button) => button.textContent === 'Delete'
            );

            if (!dialog || !confirm) throw new Error('Expected the deletion confirmation');

            try {
                // Act
                await act(async () => {
                    confirm.focus();
                    confirm.click();
                    confirm.click();
                });

                // Assert
                expect(onDelete).toHaveBeenCalledTimes(1);
                expect(confirm.getAttribute('aria-busy')).toBe('true');
                expect(document.activeElement).toBe(confirm);

                // Act
                await act(async () => finishFirst());

                // Assert
                await vi.waitFor(() => expect(confirm.getAttribute('aria-busy')).not.toBe('true'));
                expect(document.querySelector('[role="alertdialog"]')).toBe(dialog);

                // Act
                await act(async () => confirm.click());

                // Assert
                expect(onDelete).toHaveBeenCalledTimes(2);
                expect(confirm.getAttribute('aria-busy')).toBe('true');
            } finally {
                await act(async () => {
                    finishFirst();
                    finishSecond();
                });
            }
        }
    );
});

it('keeps dismissal synchronous during unrelated transitions and retains deletion across reopening', async () => {
    // Arrange
    let finish: () => void = () => undefined;

    const pending = new Promise<void>((resolve) => {
        finish = resolve;
    });

    const onDelete = vi.fn(async () => await pending);

    function Caller() {
        const [open, setOpen] = useState(true);
        const [, startTransition] = useTransition();

        return (
            <>
                <button onClick={() => setOpen(true)}>Reopen</button>
                <button onClick={() => startTransition(async () => await pending)}>Unrelated request</button>
                <DeletionDialog
                    confirmation={
                        open ? { title: 'Delete registry', description: 'Cannot be undone.', onDelete } : null
                    }
                    onClose={() => setOpen(false)}
                />
            </>
        );
    }

    await withMounted(<Caller />, async (output) => {
        const button = (label: string) => {
            const element = Array.from(document.querySelectorAll('button')).find(
                (candidate) => candidate.textContent === label || candidate.getAttribute('aria-label') === label
            );

            if (!element) throw new Error(`Expected ${label} button`);

            return element;
        };

        try {
            // Assert accessible naming and the least-destructive initial focus.
            await vi.waitFor(() => expect(document.activeElement).toBe(button('Cancel')));
            const dialog = document.querySelector('[role="alertdialog"]');
            expect(document.getElementById(dialog?.getAttribute('aria-labelledby') ?? '')?.textContent).toBe(
                'Delete registry'
            );
            expect(document.getElementById(dialog?.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
                'Cannot be undone.'
            );

            // Act: start both requests before dismissing through the header close control.
            await act(async () => {
                button('Unrelated request').click();
                button('Delete').click();
            });
            await act(async () => button('Close').click());

            // Assert: a synchronous close does not wait for either transition.
            expect(document.querySelector('[role="alertdialog"]')).toBeNull();
            await act(async () => output.querySelector('button')?.click());
            expect(button('Delete').getAttribute('aria-busy')).toBe('true');
            await act(async () => button('Delete').click());
            expect(onDelete).toHaveBeenCalledTimes(1);

            // Act: cancel is also permitted while deletion is pending.
            await act(async () => button('Cancel').click());
            expect(document.querySelector('[role="alertdialog"]')).toBeNull();
            await act(async () => output.querySelector('button')?.click());
            await act(async () => finish());

            // Assert: completion belongs to the caller, not the dialog.
            await vi.waitFor(() => expect(button('Delete').getAttribute('aria-busy')).not.toBe('true'));
            expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
        } finally {
            await act(async () => finish());
        }
    });
});

it('ignores backdrop dismissal but allows Escape while deletion is pending', async () => {
    // Arrange
    let finish: () => void = () => undefined;

    const pending = new Promise<void>((resolve) => {
        finish = resolve;
    });

    const onClose = vi.fn();

    await withMounted(
        <DeletionDialog
            confirmation={{
                title: 'Delete registry',
                description: 'Cannot be undone.',
                onDelete: async () => await pending
            }}
            onClose={onClose}
        />,
        async () => {
            const user = userEvent.setup();

            const confirm = Array.from(document.querySelectorAll('button')).find(
                (button) => button.textContent === 'Delete'
            );

            const backdrop = document.querySelector<HTMLElement>('[data-slot="alert-dialog-overlay"]');

            if (!confirm || !backdrop) throw new Error('Expected deletion dialog');

            try {
                // Act
                await act(async () => await user.click(confirm));
                await act(async () => await user.click(backdrop));

                // Assert
                expect(onClose).not.toHaveBeenCalled();
                await act(async () => await user.keyboard('{Escape}'));
                expect(onClose).toHaveBeenCalledTimes(1);
            } finally {
                await act(async () => finish());
            }
        }
    );
});

it('propagates deletion errors through the transition and allows caller-owned recovery', async () => {
    // Arrange
    const failure = new Error('Registry is still in use');
    const onError = vi.fn();
    const onClose = vi.fn();
    const onDelete = vi.fn<() => Promise<void>>().mockRejectedValueOnce(failure).mockResolvedValueOnce();

    await withMounted(
        <ErrorBoundary
            onError={onError}
            fallbackRender={({ error, resetErrorBoundary }) => (
                <button onClick={resetErrorBoundary}>{error instanceof Error ? error.message : 'Retry'}</button>
            )}
        >
            <DeletionDialog
                confirmation={{ title: 'Delete registry', description: 'Cannot be undone.', onDelete }}
                onClose={onClose}
            />
        </ErrorBoundary>,
        async (output) => {
            const confirm = Array.from(document.querySelectorAll('button')).find(
                (button) => button.textContent === 'Delete'
            );

            if (!confirm) throw new Error('Expected delete button');

            // Act
            await act(async () => confirm.click());

            // Assert: failures reach the caller's boundary without success-only closure.
            expect(onError.mock.calls[0]?.[0]).toBe(failure);
            expect(output.textContent).toBe(failure.message);
            expect(onClose).not.toHaveBeenCalled();

            // Act: recover the mounted dialog through the real error boundary.
            await act(async () => output.querySelector('button')?.click());

            const retry = Array.from(document.querySelectorAll('button')).find(
                (button) => button.textContent === 'Delete'
            );

            if (!retry) throw new Error('Expected recovered delete button');

            await act(async () => retry.click());
            expect(onDelete).toHaveBeenCalledTimes(2);
            expect(onClose).not.toHaveBeenCalled();
            expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
        }
    );
});
