// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../../../../render';
import userEvent from '@testing-library/user-event';
import { DataGridExample } from '@/platform/routes/docs/sdk/views/data-grid';

it('keeps the selected file when the documented grid changes pages and sorting', async () => {
    const user = userEvent.setup();

    await withMounted(<DataGridExample />, async (output) => {
        const selected = output.querySelector<HTMLElement>('tbody [aria-label="Select row"]');
        const next = [...output.querySelectorAll('button')].find((button) => button.textContent === 'Go to next page');
        const previous = [...output.querySelectorAll('button')].find(
            (button) => button.textContent === 'Go to previous page'
        );

        if (!selected || !next || !previous) throw new Error('Expected file selection and page controls');

        await act(async () => user.click(selected));
        await act(async () => user.click(next));
        expect(output.querySelector('tbody')?.textContent).toContain('product-photo.webp');
        expect(output.querySelector('tbody')?.textContent).not.toContain('purchase-order-871.pdf');
        expect(output.querySelector('tbody [aria-label="Select row"]')?.getAttribute('aria-checked')).toBe('false');

        await act(async () => user.click(previous));
        expect(output.querySelector('tbody')?.textContent).toContain('purchase-order-871.pdf');
        expect(output.querySelector('tbody [aria-label="Select row"]')?.getAttribute('aria-checked')).toBe('true');

        const fileHeader = [...output.querySelectorAll('thead button')].find((button) => button.textContent === 'File');
        if (!fileHeader) throw new Error('Expected file sorting control');

        await act(async () => user.click(fileHeader));
        expect(output.querySelector('tbody tr')?.textContent).toContain('delivery-note-239.pdf');
        expect(output.querySelector('tbody [aria-label="Select row"]')?.getAttribute('aria-checked')).toBe('false');
        expect(output.querySelector('tbody')?.textContent).not.toContain('purchase-order-871.pdf');

        await act(async () => user.click(next));
        expect(output.querySelector('tbody')?.textContent).toContain('purchase-order-871.pdf');
        expect(output.querySelector('tbody [aria-label="Select row"]')?.getAttribute('aria-checked')).toBe('true');
    });
});
