// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { MetadataList, MetadataListItem } from '@/components/ui/MetadataList';

it('expands hidden metadata by keyboard and collapses it again', async () => {
    // Keep conditional children from consuming the visible item limit.
    await withMounted(
        <MetadataList maxNumOfItems={1} title="Shipment">
            {false}
            <MetadataListItem label="Status">Received</MetadataListItem>
            {null}
            <MetadataListItem label="Tracking">LL-3291</MetadataListItem>
        </MetadataList>,
        async (output) => {
            const user = userEvent.setup();
            const toggle = output.querySelector('button');
            expect(toggle).not.toBeNull();

            if (!toggle) throw new Error('Missing metadata toggle');
            expect(output.querySelectorAll('dt')).toHaveLength(1);
            expect(output.textContent).not.toContain('LL-3291');
            expect(toggle.getAttribute('aria-controls')).toBe(output.querySelector('dl')?.id);
            toggle.focus();

            await act(async () => user.keyboard('{Enter}'));

            expect(toggle.getAttribute('aria-expanded')).toBe('true');
            expect(output.querySelectorAll('dt')).toHaveLength(2);
            expect(output.querySelectorAll('dd')[1]?.textContent).toBe('LL-3291');

            await act(async () => user.keyboard(' '));

            expect(toggle.getAttribute('aria-expanded')).toBe('false');
            expect(output.textContent).not.toContain('LL-3291');
            expect(document.activeElement).toBe(toggle);
        }
    );
});

it('does not hide metadata in horizontal orientation even with a zero-item limit', () => {
    // Horizontal summaries always expose every value, ignoring vertical-only options.
    const output = renderStatic(
        <MetadataList orientation="horizontal" maxNumOfItems={0} columns={3} label={{ position: 'start', width: 200 }}>
            <MetadataListItem label="Status">Received</MetadataListItem>
            <MetadataListItem label="Tracking">LL-3291</MetadataListItem>
        </MetadataList>
    );

    expect(output.querySelectorAll('dt')).toHaveLength(2);
    expect(output.querySelectorAll('dd')[1]?.textContent).toBe('LL-3291');
    expect(output.querySelector('button')).toBeNull();
    expect(output.querySelector('dl')?.style.gridTemplateColumns).toBe('');
});
