// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { Button } from '@/components/ui/Button';
import { MoreMenu } from '@/components/ui/MoreMenu';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { ButtonGroup } from '@/components/ui/ButtonGroup';

it('preserves the accessible name of compact row actions', () => {
    // Act
    const output = renderStatic(<MoreMenu label="Order actions" items={[]} />);

    // Assert
    expect(output.querySelector('button')?.getAttribute('aria-label')).toBe('Order actions');
});

it('joins group keyboard navigation without disabling or sizing its popup actions', async () => {
    const user = userEvent.setup();

    await withMounted(
        <ButtonGroup label="Actions" size="lg">
            <Button label="Save" />
            <MoreMenu label="Unavailable" isDisabled items={[]} />
            <MoreMenu label="Order actions" items={[{ label: 'Copy order' }]} />
        </ButtonGroup>,
        async (output) => {
            const buttons = output.querySelectorAll('button');

            await act(async () => {
                buttons[0]?.focus();
                await user.keyboard('{ArrowRight}');
            });
            expect(document.activeElement).toBe(buttons[2]);
            expect(buttons[2]?.getAttribute('data-size')).toBe('lg');

            await act(async () => await user.keyboard('{ArrowDown}'));
            expect(document.activeElement?.getAttribute('role')).toBe('menuitem');
            expect(document.activeElement?.textContent).toBe('Copy order');
            expect(document.activeElement?.getAttribute('data-disabled')).toBeNull();
            await act(async () => await user.keyboard('{Escape}'));
            expect(document.activeElement).toBe(buttons[2]);
        }
    );
});
