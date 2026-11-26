// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { ChartContainer, ChartLegendContent, ChartTooltipContent } from '@/components/shadcn/chart';

it('updates tooltip and legend entries with duplicate display names without duplicate keys', async () => {
    // Arrange
    const errors = vi.spyOn(console, 'error');

    function Preview() {
        const [shortened, setShortened] = useState(false);
        const payload = [
            { graphicalItemId: 'first', name: 'Orders', value: 12, color: '#112233' },
            { graphicalItemId: 'second', name: 'Orders', value: 24, color: '#445566' }
        ];
        const entries = shortened ? payload.slice(1) : payload;

        return (
            <>
                <button type="button" onClick={() => setShortened(true)}>
                    Remove first
                </button>
                <ChartContainer config={{ Orders: { label: 'Orders' } }} ref={measureChart}>
                    <div>
                        <ChartTooltipContent active hideLabel nameKey="Orders" payload={entries} />
                        <ChartLegendContent
                            nameKey="Orders"
                            payload={entries.map((entry) => ({ ...entry, value: entry.name }))}
                        />
                    </div>
                </ChartContainer>
            </>
        );
    }

    try {
        // Act
        await withMounted(<Preview />, async (output) => {
            const remove = output.querySelector('button');

            if (!remove) throw new Error('Expected removal control');
            const user = userEvent.setup();
            expect(output.textContent?.match(/Orders/g)).toHaveLength(4);
            await act(async () => user.click(remove));

            // Assert
            expect(output.textContent?.match(/Orders/g)).toHaveLength(2);
            expect(output.textContent).toContain('24');
            expect(output.textContent).not.toContain('12');
            expect(
                errors.mock.calls.filter((args) => args.some((value) => String(value).includes('same key')))
            ).toEqual([]);
        });
    } finally {
        errors.mockRestore();
    }
});

function measureChart(element: HTMLDivElement | null): void {
    const container = element?.querySelector<HTMLElement>('.recharts-responsive-container');

    if (container) container.getBoundingClientRect = () => new DOMRect(0, 0, 320, 200);
}
