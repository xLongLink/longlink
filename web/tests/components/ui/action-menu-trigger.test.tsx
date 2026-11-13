import { it, expect } from 'vitest';
// @vitest-environment happy-dom
import { act, useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { ActionMenu } from '@/components/custom/action-menu';
import { ActionButton } from '@/components/custom/action-button';
import { ActionButtonGroup } from '@/components/custom/action-button-group';

it('opens a row editor immediately while another menu action is still saving', async () => {
    let finishSave = () => {};

    const save = new Promise<void>((resolve) => {
        finishSave = resolve;
    });

    function Rows() {
        const [editing, setEditing] = useState(false);

        return (
            <>
                <ActionMenu
                    trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="First row">
                            <Ellipsis aria-hidden="true" />
                        </Button>
                    }
                    items={[{ label: 'Save', onClick: () => save }]}
                />
                <ActionMenu
                    trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Second row">
                            <Ellipsis aria-hidden="true" />
                        </Button>
                    }
                    align="end"
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
    const output = renderStatic(
        <ActionMenu
            trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Order actions">
                    <Ellipsis aria-hidden="true" />
                </Button>
            }
            items={[]}
        />
    );

    // Assert
    expect(output.querySelector('button')?.getAttribute('aria-label')).toBe('Order actions');
});

it('joins group keyboard navigation without disabling or sizing its popup actions', async () => {
    const user = userEvent.setup();

    await withMounted(
        <ActionButtonGroup label="Actions" size="lg">
            <ActionButton variant="outline">Save</ActionButton>
            <ActionMenu
                trigger={
                    <Button variant="ghost" size="icon-lg" aria-label="Unavailable" disabled>
                        <Ellipsis aria-hidden="true" />
                    </Button>
                }
                items={[]}
            />
            <ActionMenu
                trigger={
                    <Button variant="ghost" size="icon-lg" aria-label="Order actions">
                        <Ellipsis aria-hidden="true" />
                    </Button>
                }
                items={[{ label: 'Copy order' }]}
            />
        </ActionButtonGroup>,
        async (output) => {
            const buttons = output.querySelectorAll('button');

            await act(async () => {
                buttons[0]?.focus();
                await user.keyboard('{ArrowRight}');
            });
            expect(document.activeElement).toBe(buttons[2]);

            await act(async () => await user.keyboard('{ArrowDown}'));
            expect(document.activeElement?.getAttribute('role')).toBe('menuitem');
            expect(document.activeElement?.textContent).toBe('Copy order');
            expect(document.activeElement?.getAttribute('data-disabled')).toBeNull();
            await act(async () => await user.keyboard('{Escape}'));
            expect(document.activeElement).toBe(buttons[2]);
        }
    );
});
