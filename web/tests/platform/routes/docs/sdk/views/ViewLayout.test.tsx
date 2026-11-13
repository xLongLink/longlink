// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../../../../render';
import ViewLayout from '@/platform/routes/docs/sdk/views/ViewLayout';

it('rejects references absent from the published component catalog', () => {
    // Act / Assert
    expect(() => renderStatic(<ViewLayout name="MissingComponent" introduction="" />)).toThrow(
        'Missing View documentation: MissingComponent'
    );
});

it('keeps an edited preview mounted while its code switch changes modes', async () => {
    const user = userEvent.setup();
    const code = 'const retainedPreviewExample = true;';

    await withMounted(
        <ViewLayout
            name="Button"
            introduction="Actions in a View."
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

it('opens the example first and lets readers switch to the property reference and back', async () => {
    const user = userEvent.setup();

    await withMounted(
        <ViewLayout
            name="Card"
            introduction="Content in a View."
            properties={[{ name: 'padding', type: 'number', description: 'Inner spacing.' }]}
            example={{ title: 'Plain card', code: '<Card />', preview: <p>Order details</p> }}
        />,
        async (output) => {
            const [exampleTab, propertiesTab] = output.querySelectorAll<HTMLButtonElement>('[role="tab"]');

            if (!exampleTab || !propertiesTab) throw new Error('Expected example and properties tabs');
            expect(exampleTab.textContent).toBe('Example');
            expect(propertiesTab.textContent).toBe('Properties');
            expect(output.querySelector('[role="tabpanel"]')?.textContent).toContain('Order details');
            expect(output.textContent).not.toContain('Inner spacing.');

            await act(async () => user.click(propertiesTab));
            expect(output.querySelector('[role="tabpanel"]')?.textContent).toContain('Inner spacing.');
            expect(output.textContent).not.toContain('Order details');

            await act(async () => user.click(exampleTab));
            expect(output.querySelector('[role="tabpanel"]')?.textContent).toContain('Order details');
            expect(output.textContent).not.toContain('Inner spacing.');
        }
    );
});
