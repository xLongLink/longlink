// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import Pricing from '@/platform/routes/pricing';

it('formats included storage allowances in MiB and GiB', () => {
    // Act
    const output = renderStatic(<Pricing />);

    // Assert
    expect(output.textContent).toContain('100 MiB database storage');
    expect(output.textContent).toContain('1 GiB file storage');
});
