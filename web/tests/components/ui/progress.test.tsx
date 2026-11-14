import { it, expect } from 'vitest';
// @vitest-environment happy-dom
import { act, useState } from 'react';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { Progress, ProgressLabel, ProgressValue } from '@/components/shadcn/progress';

it('updates visible usage and accessible progress together through native composition', async () => {
    function Usage() {
        const [value, setValue] = useState<number | null>(25);

        return (
            <>
                <Progress value={value} max={50}>
                    <ProgressLabel>Storage</ProgressLabel>
                    <ProgressValue>
                        {(_, current) => (current === null ? 'Measuring' : `${current} of 50 GB`)}
                    </ProgressValue>
                </Progress>
                <button type="button" onClick={() => setValue(40)}>
                    Update
                </button>
                <button type="button" onClick={() => setValue(null)}>
                    Measure
                </button>
            </>
        );
    }

    await withMounted(<Usage />, async (output) => {
        const user = userEvent.setup();
        const progress = output.querySelector('[role="progressbar"]');
        const buttons = output.querySelectorAll('button');

        expect(progress?.getAttribute('aria-valuenow')).toBe('25');
        expect(progress?.getAttribute('aria-valuemax')).toBe('50');
        expect(output.querySelector('[data-slot="progress-value"]')?.textContent).toBe('25 of 50 GB');
        const labelId = progress?.getAttribute('aria-labelledby');
        expect(output.querySelector(`[id="${labelId}"]`)?.textContent).toBe('Storage');

        await act(async () => user.click(buttons[0]));
        expect(progress?.getAttribute('aria-valuenow')).toBe('40');
        expect(output.querySelector('[data-slot="progress-value"]')?.textContent).toBe('40 of 50 GB');

        await act(async () => user.click(buttons[1]));
        expect(progress?.hasAttribute('aria-valuenow')).toBe(false);
        expect(output.querySelector('[data-slot="progress-value"]')?.textContent).toBe('Measuring');
    });
});
