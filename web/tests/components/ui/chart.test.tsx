// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { ChartContainer, ChartLegendContent, ChartTooltipContent } from '@/components/shadcn/chart';

it.each([
    { color: undefined, fill: '#112233', expected: '#112233' },
    { color: '#445566', fill: '#112233', expected: '#445566' },
    { color: undefined, fill: undefined, expected: '#778899' }
])('resolves tooltip indicator color with color=$color and payload fill=$fill', async ({ color, fill, expected }) => {
    // Arrange
    const payload = [{ graphicalItemId: 'orders', name: 'Orders', value: 12, color: '#778899', payload: { fill } }];

    // Act
    await withMounted(
        <ChartContainer config={{}} ref={measureChart}>
            <ChartTooltipContent active hideLabel payload={payload} color={color} />
        </ChartContainer>,
        async (output) => {
            // Assert
            const indicator = output.querySelector<HTMLElement>('[style*="--color-bg"]');

            if (!indicator) throw new Error('Expected tooltip indicator');
            expect(indicator.style.getPropertyValue('--color-bg')).toBe(expected);
            expect(indicator.style.getPropertyValue('--color-border')).toBe(expected);
        }
    );
});

it('keeps dashed tooltip indicators transparent while supplying their border color', async () => {
    // Arrange
    const payload = [{ graphicalItemId: 'orders', name: 'Orders', value: 12, payload: { fill: '#112233' } }];

    // Act
    await withMounted(
        <ChartContainer config={{}} ref={measureChart}>
            <ChartTooltipContent active hideLabel indicator="dashed" payload={payload} />
        </ChartContainer>,
        async (output) => {
            // Assert
            const indicator = output.querySelector<HTMLElement>('[style*="--color-border"]');

            if (!indicator) throw new Error('Expected dashed tooltip indicator');
            expect(indicator.classList.contains('border-dashed')).toBe(true);
            expect(indicator.classList.contains('bg-transparent')).toBe(true);
            expect(indicator.style.backgroundColor).toBe('');
            expect(indicator.style.borderColor).toBe('');
            expect(indicator.style.getPropertyValue('--color-border')).toBe('#112233');
        }
    );
});

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
