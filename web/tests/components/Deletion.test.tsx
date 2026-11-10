// @vitest-environment happy-dom
import { act } from 'react';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import { renderPlatform } from '../platform/render';
import { DeletionDialog } from '@/components/Deletion';

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
                    confirm.click();
                    confirm.click();
                });

                // Assert
                expect(onDelete).toHaveBeenCalledTimes(1);
                expect(confirm.getAttribute('aria-busy')).toBe('true');

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
