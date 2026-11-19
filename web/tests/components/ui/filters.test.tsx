// @vitest-environment happy-dom
import { act } from 'react';
import { expect, it } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { Filters } from '@/components/longlink/display/filters';

it('adds the searched nested field rather than a field with the same id in another branch', async () => {
    // Arrange
    const changes: Parameters<NonNullable<Parameters<typeof Filters>[0]['onQueryChange']>>[] = [];
    const fields = [
        { id: 'shipping', label: 'Shipping', fields: [{ id: 'city', label: 'Shipping city' }] },
        {
            id: 'billing',
            label: 'Billing',
            fields: [
                {
                    id: 'address',
                    label: 'Address',
                    fields: [{ id: 'city', label: 'Invoice city', keywords: ['invoicing'] }]
                }
            ]
        }
    ];

    await withMounted(
        <Filters fields={fields} onQueryChange={(...change) => changes.push(change)} />,
        async (output) => {
            const events = userEvent.setup();
            const add = Array.from(output.querySelectorAll('button')).find(
                (button) => button.textContent === 'Add filter'
            );
            if (!add) throw new Error('Missing Add filter button');

            // Act
            await act(async () => events.click(add));
            const search = document.querySelector<HTMLInputElement>('input[placeholder="Search attributes..."]');
            if (!search) throw new Error('Missing field search');

            await act(async () => events.type(search, 'invoicing'));
            const result = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((option) =>
                option.textContent?.includes('Invoice city')
            );
            if (!result) throw new Error('Missing nested search result');

            await act(async () => events.click(result));

            // Assert
            expect(changes).toHaveLength(1);
            const change = changes[0];
            if (!change) throw new Error('Missing filter change');

            const [query, details] = change;
            expect(query.rules).toHaveLength(1);
            const rule = query.rules[0];
            if (!rule || rule.type !== 'rule') throw new Error('Missing added filter rule');

            expect(rule.path).toEqual(['billing', 'address', 'city']);
            expect(details.reason).toBe('add');
            expect(details.field?.label).toBe('Invoice city');
            expect(output.textContent).toContain('Invoice city');
            expect(output.textContent).not.toContain('Shipping city');
        }
    );
});
