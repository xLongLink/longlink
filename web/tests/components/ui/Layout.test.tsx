// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../render';
import { Grid, GridSpan } from '@/components/ui/Grid';
import { Stack, StackItem } from '@/components/ui/Stack';

it('collapses spanning children on viewport changes without collapsing nested independent grids', async () => {
    const originalWidth = window.innerWidth;

    try {
        await act(async () => {
            window.innerWidth = 1000;
            window.dispatchEvent(new Event('resize'));
        });

        await withMounted(
            <Grid columns={3} collapseBelow={600}>
                <GridSpan columns={2}>
                    <Grid columns={2}>
                        <GridSpan columns={2}>Nested</GridSpan>
                    </Grid>
                </GridSpan>
            </Grid>,
            async (output) => {
                const spans = output.querySelectorAll<HTMLElement>('.view-grid-span');
                expect(spans[0]?.style.gridColumn).toBe('span 2');

                await act(async () => {
                    window.innerWidth = 600;
                    window.dispatchEvent(new Event('resize'));
                });

                expect(spans[0]?.style.gridColumn).toBe('1 / -1');
                expect(spans[1]?.style.gridColumn).toBe('span 2');

                await act(async () => {
                    window.innerWidth = 601;
                    window.dispatchEvent(new Event('resize'));
                });

                expect(spans[0]?.style.gridColumn).toBe('span 2');
            }
        );
    } finally {
        window.innerWidth = originalWidth;
        window.dispatchEvent(new Event('resize'));
    }
});

it('names a scrolling StackItem only while its retained content overflows', async () => {
    await withMounted(
        <Stack height={100}>
            <StackItem size="fill" isScrollable>
                <p>Content</p>
            </StackItem>
        </Stack>,
        async (output) => {
            const item = output.querySelector<HTMLElement>('.view-stack-item');

            if (!item) throw new Error('Expected the scroll container');
            let contentHeight = 200;

            // Supply layout measurements missing from Happy DOM, keeping real resize delivery.
            Object.defineProperties(item, {
                clientWidth: { value: 100 },
                clientHeight: { value: 100 },
                scrollWidth: { value: 100 },
                scrollHeight: { get: () => contentHeight },
            });

            await act(async () => window.dispatchEvent(new Event('resize')));
            expect(item.getAttribute('role')).toBe('group');
            expect(item.getAttribute('aria-label')).toBe('Content');

            contentHeight = 101;
            await act(async () => window.dispatchEvent(new Event('resize')));
            expect(item.hasAttribute('role')).toBe(false);
            expect(item.hasAttribute('aria-label')).toBe(false);
        }
    );
});
