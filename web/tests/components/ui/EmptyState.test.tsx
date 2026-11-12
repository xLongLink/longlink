// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { EmptyState } from '@/components/ui/EmptyState';
import { renderStatic, withMounted } from '../../render';

it('retains heading semantics and the compact presentation without creating a duplicate live region', () => {
    // Empty results keep their place in the document outline after the rendering primitive changes.
    const output = renderStatic(<EmptyState title="No matching orders" isCompact />);

    expect(output.querySelector('h3')?.textContent).toBe('No matching orders');
    expect(output.querySelector('h3')?.hasAttribute('data-compact')).toBe(true);
    expect(output.querySelector('[aria-live]')).toBeNull();
});

it('announces changed empty results through the existing shared channel', async () => {
    // Updating a result message must remain perceivable without adding another live-region owner.
    function Results() {
        const [title, setTitle] = useState('No matching orders');

        return (
            <>
                <EmptyState title={title} />
                <button onClick={() => setTitle('No archived orders')}>Archive</button>
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        await act(async () => output.querySelector('button')?.click());
        await vi.waitFor(() =>
            expect(document.querySelector('[data-astryx-live-region="polite"]')?.textContent).toContain(
                'No archived orders'
            )
        );
        expect(output.querySelector('h3')?.textContent).toBe('No archived orders');
        expect(output.querySelector('[aria-live]')).toBeNull();
    });
});
