// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { ProgressBar } from '@/components/ui/ProgressBar';

it('exposes authored progress limits to assistive technology', () => {
    // Act
    const output = renderStatic(<ProgressBar label="Storage" value={25} max={50} />);

    // Assert
    expect(output.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('25');
    expect(output.querySelector('[role="progressbar"]')?.getAttribute('aria-valuemax')).toBe('50');
});

it.each([
    { value: 80, max: 50, expected: 50, text: '100%' },
    { value: -5, max: 50, expected: 0, text: '0%' },
    { value: Number.NaN, max: 50, expected: 0, text: '0%' },
    { value: 20, max: Number.POSITIVE_INFINITY, expected: 0, text: '0%' },
    { value: 20, max: 0, expected: 0, text: '0%' },
])('keeps existing input normalization for $value / $max', ({ value, max, expected, text }) => {
    const output = renderStatic(<ProgressBar label="Storage" value={value} max={max} hasValueLabel />);
    const progress = output.querySelector('[role="progressbar"]');
    expect(progress?.getAttribute('aria-valuenow')).toBe(String(expected));
    expect(progress?.getAttribute('aria-valuemax')).toBe(String(Number.isFinite(max) ? max : 0));
    expect(progress?.getAttribute('aria-valuetext')).toBe(text);
    expect(output.querySelector('header')?.textContent).toBe(`Storage${text}`);
});

it('updates formatted visible and accessible text while keeping marks independently focusable', async () => {
    function Usage() {
        const [value, setValue] = useState(25);

        return (
            <>
                <ProgressBar
                    label="Storage"
                    value={value}
                    max={50}
                    hasValueLabel
                    isLabelHidden
                    formatValueLabel={(current, max) => `${current} of ${max} GB`}
                    marks={[
                        { value: 25, label: 'Target' },
                        { value: 100, label: 'Limit' },
                        { value: Number.NaN, label: 'Invalid' },
                    ]}
                />
                <button onClick={() => setValue(40)}>Update</button>
            </>
        );
    }

    await withMounted(<Usage />, async (output) => {
        const progress = output.querySelector('[role="progressbar"]');
        const target = output.querySelector<HTMLElement>('[aria-label="Target"]');
        expect(target?.getAttribute('tabindex')).toBe('0');
        expect(progress?.contains(target)).toBe(false);
        expect(target?.getAttribute('data-placement')).toBe('fill');
        expect(output.querySelector('[aria-label="Limit"]')?.getAttribute('style')).toContain(
            'inset-inline-start: 100%'
        );
        expect(output.querySelector('[aria-label="Invalid"]')).toBeNull();
        expect(output.querySelector(`#${progress?.getAttribute('aria-labelledby')}`)?.textContent).toBe('Storage');
        await act(async () => userEvent.tab());
        expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Target');
        expect(output.querySelector('[data-astryx-theme] [role="tooltip"]')?.textContent).toBe('Target');
        await act(async () => output.querySelector('button')?.click());
        expect(progress?.getAttribute('aria-valuenow')).toBe('40');
        expect(progress?.getAttribute('aria-valuetext')).toBe('40 of 50 GB');
        expect(output.querySelector('header')?.textContent).toBe('Storage40 of 50 GB');
    });
});

it('omits numeric claims, value labels, and target marks while indeterminate', () => {
    const output = renderStatic(
        <ProgressBar
            label="Loading"
            value={25}
            isIndeterminate
            hasValueLabel
            marks={[{ value: 10, label: 'Target' }]}
        />
    );

    const progress = output.querySelector('[role="progressbar"]');

    for (const attribute of ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext']) {
        expect(progress?.hasAttribute(attribute)).toBe(false);
    }

    expect(output.querySelector('header')?.textContent).toBe('Loading');
    expect(output.querySelector('[aria-label="Target"]')).toBeNull();
    expect(output.querySelector('[data-slot="progress-indicator"]')?.hasAttribute('data-indeterminate')).toBe(true);
});

it('dims disabled progress and clamps negative marks to the start of the rail', () => {
    const output = renderStatic(
        <ProgressBar label="Storage" value={20} variant="success" isDisabled marks={[{ value: -10, label: 'Start' }]} />
    );

    const fill = output.querySelector<HTMLElement>('[data-slot="progress-indicator"]');
    const mark = output.querySelector<HTMLElement>('[aria-label="Start"]');
    expect(fill?.style.backgroundColor).toBe('var(--color-text-disabled)');
    expect(mark?.style.backgroundColor).toBe('var(--color-text-secondary)');
    expect(mark?.style.insetInlineStart).toBe('0%');
    expect(output.querySelector('header p')?.classList.contains('text-(--color-text-disabled)')).toBe(true);
    expect(output.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('20');
});
