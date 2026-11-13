import { it, expect } from 'vitest';
// @vitest-environment happy-dom
import { act, useState } from 'react';
import userEvent from '@testing-library/user-event';
import { MoreMenu } from '@/components/custom/MoreMenu';
import { renderStatic, withMounted } from '../../render';
import { ActionButton } from '@/components/custom/ActionButton';
import { NativeMoreMenu } from '@/components/custom/NativeMoreMenu';
import { ActionButtonGroup } from '@/components/custom/ActionButtonGroup';

it('opens a row editor immediately while another menu action is still saving', async () => {
    let finishSave = () => {};

    const save = new Promise<void>((resolve) => {
        finishSave = resolve;
    });

    function Rows() {
        const [editing, setEditing] = useState(false);

        return (
            <>
                <NativeMoreMenu label="First row" items={[{ label: 'Save', onClick: () => save }]} />
                <NativeMoreMenu
                    label="Second row"
                    size="sm"
                    alignment="end"
                    items={[{ label: 'Edit', onClick: () => setEditing(true) }]}
                />
                {editing && <section role="dialog" aria-label="Edit second row" />}
            </>
        );
    }

    try {
        await withMounted(<Rows />, async (output) => {
            const triggers = output.querySelectorAll('button');

            await act(async () => triggers[0]?.click());
            await act(async () => document.querySelector<HTMLElement>('[role="menuitem"]')?.click());
            await act(async () => triggers[1]?.click());
            await act(async () => document.querySelector<HTMLElement>('[role="menuitem"]')?.click());

            expect(output.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Edit second row');
            expect(triggers[1]?.getAttribute('data-size')).toBe('sm');
            await act(async () => {
                finishSave();
                await save;
            });
            expect(output.querySelector('[role="dialog"]')).not.toBeNull();
        });
    } finally {
        finishSave();
    }
});

it('preserves the accessible name of compact row actions', () => {
    // Act
    const output = renderStatic(<MoreMenu label="Order actions" items={[]} />);

    // Assert
    expect(output.querySelector('button')?.getAttribute('aria-label')).toBe('Order actions');
});

it('joins group keyboard navigation without disabling or sizing its popup actions', async () => {
    const user = userEvent.setup();

    await withMounted(
        <ActionButtonGroup label="Actions" size="lg">
            <ActionButton variant="outline">Save</ActionButton>
            <MoreMenu label="Unavailable" isDisabled items={[]} />
            <MoreMenu label="Order actions" items={[{ label: 'Copy order' }]} />
        </ActionButtonGroup>,
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
