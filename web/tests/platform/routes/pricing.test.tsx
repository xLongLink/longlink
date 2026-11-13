// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import Pricing from '@/platform/routes/pricing';

it('keeps Organization allowances separate from per-user pricing', () => {
    // Act
    const output = renderStatic(<Pricing />);

    // Assert
    expect(output.querySelector('h1')?.textContent).toBe('Pricing');
    expect(output.textContent).toContain('Billed per Organization');
    expect(output.textContent).toContain('100 MiB database storage');
    expect(output.textContent).toContain('1 GiB file storage');
});
