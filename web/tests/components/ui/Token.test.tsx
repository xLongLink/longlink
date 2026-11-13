// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { Token } from '@/components/ui/Token';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';

it('does not invent an action for a descriptive tag', () => {
    // Act
    const output = renderStatic(<Token label="Priority" description="Urgent orders" />);

    // Assert
    expect(output.textContent).toContain('Priority');
    expect(output.querySelector('button')).toBeNull();
    expect(output.querySelector('[aria-description]')?.getAttribute('aria-description')).toBe('Urgent orders');
});

it('activates and removes independently by pointer and keyboard without submitting a form', async () => {
    // Removing a filter must not also open it, activate its parent, or submit the surrounding editor.
    const user = userEvent.setup();
    const actions: string[] = [];

    await withMounted(
        <form
            onClick={() => actions.push('parent')}
            onSubmit={(event) => {
                event.preventDefault();
                actions.push('submit');
            }}
        >
            <Token
                label="Priority"
                description="Urgent orders"
                icon="check"
                onClick={() => actions.push('open')}
                onRemove={() => actions.push('remove')}
            />
        </form>,
        async (output) => {
            const main = output.querySelector<HTMLButtonElement>('.view-token-action');
            const remove = output.querySelector<HTMLButtonElement>('button[aria-label="Remove Priority"]');

            if (!main || !remove) throw new Error('Expected independent token actions');
            expect(main.getAttribute('aria-description')).toBe('Urgent orders');
            expect(main.textContent).toBe('Priority');
            expect(main.contains(remove)).toBe(false);
            await act(async () => user.click(remove));
            expect(actions).toEqual(['remove']);
            await act(async () => user.tab({ shift: true }));
            expect(document.activeElement).toBe(main);
            await act(async () => user.keyboard('{Enter} '));
            expect(actions).toEqual(['remove', 'open', 'parent', 'open', 'parent']);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(remove);
            await act(async () => user.keyboard('{Enter} '));
            expect(actions).toEqual(['remove', 'open', 'parent', 'open', 'parent', 'remove', 'remove']);
            await act(async () => user.click(main));
            expect(actions).toEqual([
                'remove',
                'open',
                'parent',
                'open',
                'parent',
                'remove',
                'remove',
                'open',
                'parent'
            ]);
        }
    );
});

it('keeps disabled actions discoverable but blocks pointer, keyboard, and ancestor activation', async () => {
    // A locked selection must not change or accidentally submit merely because its actions remain in Tab order.
    const user = userEvent.setup();
    const actions: string[] = [];

    await withMounted(
        <form
            onClick={() => actions.push('parent')}
            onSubmit={(event) => {
                event.preventDefault();
                actions.push('submit');
            }}
        >
            <Token
                label="Locked"
                disabled
                onClick={() => actions.push('open')}
                onRemove={() => actions.push('remove')}
            />
            <button type="button">Next</button>
        </form>,
        async (output) => {
            const buttons = output.querySelectorAll('button');

            if (buttons.length !== 3) throw new Error('Expected two token actions and the next control');

            for (const button of [buttons[0], buttons[1]]) {
                await act(async () => user.tab());
                expect(document.activeElement).toBe(button);
                expect(button.getAttribute('aria-disabled')).toBe('true');
                await act(async () => user.keyboard('{Enter} '));
                await act(async () => user.click(button));
            }

            expect(actions).toEqual([]);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(buttons[2]);
        }
    );
});

it('offers only removal for a removable descriptive token', async () => {
    // Adding dismissal to a tag must not invent a second action or submit its surrounding form.
    const user = userEvent.setup();
    const actions: string[] = [];

    await withMounted(
        <form
            onSubmit={(event) => {
                event.preventDefault();
                actions.push('submit');
            }}
        >
            <Token label="Research" onRemove={() => actions.push('remove')} />
        </form>,
        async (output) => {
            const remove = output.querySelector('button');

            if (!remove) throw new Error('Expected a remove action');
            expect(output.querySelectorAll('button')).toHaveLength(1);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(remove);
            await act(async () => user.keyboard(' '));
            expect(actions).toEqual(['remove']);
        }
    );
});
