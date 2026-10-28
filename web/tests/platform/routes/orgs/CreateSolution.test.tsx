// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../../render';
import CreateSolution from '@/platform/routes/orgs/CreateSolution';

it('does not complete creation before image inspection', async () => {
    // Arrange
    const completions: string[] = [];

    // Act
    await withMounted(
        <CreateSolution
            organizationId="organization"
            onSuccess={() => {
                completions.push('created');
            }}
            onClose={() => undefined}
        />,
        async () => {
            const dialog = document.querySelector('dialog');
            const form = dialog?.querySelector('form');
            await act(async () => {
                form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            });

            // Assert
            expect(dialog?.textContent).toContain('Choose a Solution image');
            expect(dialog?.querySelector('[data-step-panel="0"]')?.hasAttribute('hidden')).toBe(false);
            expect(completions).toEqual([]);
        }
    );
});
