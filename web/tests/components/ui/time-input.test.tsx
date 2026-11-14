// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { TimeInput } from '@/components/custom/time-input';
import type { ISOTimeString } from '@/components/custom/temporal';

it('serializes one canonical time rather than picker display fields', () => {
    // Act
    // SAFETY: The fixture is a canonical 24-hour ISO time literal.
    const output = renderStatic(<TimeInput label="Start time" name="start" defaultValue={'09:30' as ISOTimeString} />);

    // Assert
    expect(output.querySelector('input[name="start"]')?.getAttribute('value')).toBe('09:30');
    expect(output.querySelectorAll('[name="start"]')).toHaveLength(1);
});
