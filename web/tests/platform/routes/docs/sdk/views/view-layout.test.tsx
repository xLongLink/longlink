// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../../../render';
import userEvent from '@testing-library/user-event';
import { RequestContext } from '@/lib/view-capabilities';
import ViewLayout from '@/platform/routes/docs/sdk/views/view-layout';
import FormDocumentation from '@/platform/routes/docs/sdk/views/form-documentation';

it('switches between the example and authored companion references without merging published properties', async () => {
    const user = userEvent.setup();

    await withMounted(
        <ViewLayout
            name="Button"
            properties={[
                { name: 'size', type: 'AuthoredButtonSize' },
                { name: 'ButtonGroup.orientation', type: 'AuthoredOrientation' },
                { name: 'ButtonGroupSeparator.orientation', type: 'AuthoredSeparatorOrientation' }
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
            expect(Array.from(output.querySelectorAll('table'), (table) => table.getAttribute('aria-label'))).toEqual([
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
                ['orientation', 'AuthoredOrientation', '"horizontal"'],
                ['orientation', 'AuthoredSeparatorOrientation', '"vertical"']
            ]);
            await act(async () => user.click(exampleTab));
            expect(output.querySelector('[role="tabpanel"]')?.textContent).toContain('Order details');
            expect(output.querySelector('table')).toBeNull();
        }
    );
});

it('keeps an edited form preview local through code toggles and submission', async () => {
    const user = userEvent.setup();
    const code = 'const retainedPreviewExample = true;';
    const request = vi.fn().mockResolvedValue({});

    await withMounted(
        <RequestContext value={{ request }}>
            <FormDocumentation name="Input" code={code} preview={<input aria-label="Preview draft" />} />
        </RequestContext>,
        async (output) => {
            const input = output.querySelector<HTMLInputElement>('input[aria-label="Preview draft"]');
            const toggle = output.querySelector<HTMLElement>('[role="switch"][aria-label="Show code"]');
            const form = output.querySelector('form');

            if (!input || !toggle || !form) throw new Error('Expected preview form and code switch');
            await act(async () => user.type(input, 'Keep this draft'));
            await act(async () => user.click(toggle));
            expect(output.textContent).toContain(code);
            await act(async () => user.keyboard(' '));
            expect(output.textContent).not.toContain(code);
            expect(output.querySelector('input[aria-label="Preview draft"]')).toBe(input);

            const submission = new Event('submit', { bubbles: true, cancelable: true });

            await act(async () => {
                form.dispatchEvent(submission);
            });

            expect(submission.defaultPrevented).toBe(true);
            expect(request).not.toHaveBeenCalled();
            expect(input.value).toBe('Keep this draft');
        }
    );
});
