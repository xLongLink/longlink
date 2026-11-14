// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { DateInput } from '@/components/custom/date-input';

it('serializes canonical ISO dates independently of the picker display', () => {
    // Act
    const output = renderStatic(<DateInput label="Due date" name="due" defaultValue="2026-10-16" />);

    // Assert
    expect(output.querySelector('input[name="due"]')?.getAttribute('value')).toBe('2026-10-16');
    expect(output.querySelectorAll('[name="due"]')).toHaveLength(1);
});
