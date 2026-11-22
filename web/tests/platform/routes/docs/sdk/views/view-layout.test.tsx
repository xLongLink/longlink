// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../../../../render';
import ViewLayout from '@/platform/routes/docs/sdk/views/view-layout';

it('rejects references absent from the published component catalog', () => {
    // Act / Assert
    expect(() => renderStatic(<ViewLayout name="MissingComponent" />)).toThrow(
        'Missing View documentation: MissingComponent'
    );
});

it.each([
    { label: 'omitted', properties: undefined, hasCatalogProperties: true },
    { label: 'explicitly empty', properties: [], hasCatalogProperties: false }
])('respects $label property selection', async ({ properties, hasCatalogProperties }) => {
    const user = userEvent.setup();

    await withMounted(<ViewLayout name="Button" properties={properties} />, async (output) => {
        const propertiesTab = output.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1];

        if (!propertiesTab) throw new Error('Expected properties tab');
        await act(async () => user.click(propertiesTab));
        const table = output.querySelector('table[aria-label="Button properties"]');

        if (!hasCatalogProperties) {
            expect(output.querySelector('table')).toBeNull();
            return;
        }

        const sizeRow = Array.from(table?.querySelectorAll('tbody tr') ?? []).find(
            (row) => row.querySelector('td')?.textContent === 'size'
        );

        expect(sizeRow?.lastElementChild?.textContent).toBe('"default"');
    });
});

it('switches between the example and authored companion references without merging published properties', async () => {
    const user = userEvent.setup();

    await withMounted(
        <ViewLayout
            name="Button"
            properties={[
                { name: 'size', type: 'AuthoredButtonSize' },
                { name: 'ButtonGroup.children', type: 'ReactNode' },
                { name: 'ButtonGroup.orientation', type: '"horizontal" | "vertical"' },
                { name: 'ButtonGroupSeparator.orientation', type: '"horizontal" | "vertical"' }
            ]}
            example={{ title: 'Plain card', code: '<Card />', preview: <p>Order details</p> }}
        />,
        async (output) => {
            const [exampleTab, propertiesTab] = output.querySelectorAll<HTMLButtonElement>('[role="tab"]');

            if (!exampleTab || !propertiesTab) throw new Error('Expected example and properties tabs');
            expect(output.querySelector('[role="tabpanel"]')?.textContent).toContain('Order details');
            expect(output.querySelector('table')).toBeNull();
            await act(async () => user.click(propertiesTab));
            expect(output.textContent).not.toContain('Order details');
            expect(Array.from(output.querySelectorAll('h3'), (heading) => heading.textContent)).toEqual([
                'Button',
                'ButtonGroup',
                'ButtonGroupSeparator'
            ]);
            const tables = output.querySelectorAll('table');

            expect(Array.from(tables, (table) => table.getAttribute('aria-label'))).toEqual([
                'Button properties',
                'ButtonGroup properties',
                'ButtonGroupSeparator properties'
            ]);
            expect(
                Array.from(output.querySelectorAll('tbody tr'), (row) =>
                    Array.from(row.querySelectorAll('td'), (cell) => cell.textContent)
                )
            ).toEqual([
                ['size', 'AuthoredButtonSize', '"default"'],
                ['children', 'ReactNode', '-'],
                ['orientation', '"horizontal" | "vertical"', '"horizontal"'],
                ['orientation', '"horizontal" | "vertical"', '"vertical"']
            ]);
            await act(async () => user.click(exampleTab));
            expect(output.querySelector('[role="tabpanel"]')?.textContent).toContain('Order details');
            expect(output.querySelector('table')).toBeNull();
        }
    );
});

it('keeps an edited preview mounted while its code switch changes modes', async () => {
    const user = userEvent.setup();
    const code = 'const retainedPreviewExample = true;';

    await withMounted(
        <ViewLayout
            name="Button"
            example={{ title: 'Draft action', code, preview: <input aria-label="Preview draft" /> }}
        />,
        async (output) => {
            const input = output.querySelector<HTMLInputElement>('input[aria-label="Preview draft"]');
            const toggle = output.querySelector<HTMLElement>('[role="switch"][aria-label="Show code"]');

            if (!input || !toggle) throw new Error('Expected preview and code switch');
            await act(async () => user.type(input, 'Keep this draft'));
            await act(async () => user.click(toggle));
            expect(toggle.getAttribute('aria-checked')).toBe('true');
            expect(output.textContent).toContain(code);
            await act(async () => user.keyboard(' '));
            expect(toggle.getAttribute('aria-checked')).toBe('false');
            expect(output.textContent).not.toContain(code);
            expect(output.querySelector('input[aria-label="Preview draft"]')).toBe(input);
            expect(input.value).toBe('Keep this draft');
        }
    );
});
