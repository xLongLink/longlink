// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { MultiSelector } from '@/components/ui/MultiSelector';
import { Selector, type SelectorOptionType } from '@/components/ui/Selector';

it.each([false, true])(
    'renders direct and grouped option icons without changing submitted values (multiple: %s)',
    async (multiple) => {
        // Arrange distinct submitted identifiers and labels across both option shapes.
        const options: SelectorOptionType[] = [
            'Plain',
            { value: 'database-id', label: 'Database', icon: 'database', description: 'Primary storage' },
            { type: 'divider' },
            {
                type: 'section',
                title: 'People',
                options: [
                    { value: 'owner-id', label: 'Owner', icon: 'userRound' },
                    { value: 'blocked-id', label: 'Blocked', icon: 'warning', disabled: true }
                ]
            }
        ];

        await withMounted(
            <form>
                {multiple ? (
                    <MultiSelector label="Records" name="records" options={options} defaultValue={['database-id']} />
                ) : (
                    <Selector label="Records" name="records" options={options} defaultValue="database-id" />
                )}
            </form>,
            async (output) => {
                const form = output.querySelector('form');
                const trigger = output.querySelector<HTMLButtonElement>('[role="combobox"]');
                const events = userEvent.setup();

                if (!form || !trigger) throw new Error('Expected the selector form');

                // Open the real option picker, including section and disabled rows.
                await act(async () => events.click(trigger));
                const listboxId = trigger.getAttribute('aria-controls');
                const listbox = listboxId ? document.getElementById(listboxId) : null;

                if (!listbox) throw new Error('Expected the selector listbox');

                const rows = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));
                const database = rows.find((row) => row.textContent?.includes('Database'));
                const owner = rows.find((row) => row.textContent?.includes('Owner'));
                const blocked = rows.find((row) => row.textContent?.includes('Blocked'));

                expect(database?.querySelector('svg.lucide-database')).toBeTruthy();
                expect(database?.textContent).toContain('Primary storage');
                expect(owner?.querySelector('svg.lucide-user-round')).toBeTruthy();
                expect(blocked?.getAttribute('aria-disabled')).toBe('true');
                expect(rows.some((row) => row.textContent === 'Plain')).toBe(true);
                expect(new FormData(form).getAll('records')).toEqual(['database-id']);

                if (!owner) throw new Error('Expected the grouped Owner option');

                // Choosing a grouped label must submit its identifier, retaining multiple selections.
                await act(async () => owner.click());
                expect(new FormData(form).getAll('records')).toEqual(
                    multiple ? ['database-id', 'owner-id'] : ['owner-id']
                );
            }
        );
    }
);
