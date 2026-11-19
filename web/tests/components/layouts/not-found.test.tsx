// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import NotFound from '@/components/layouts/not-found';

it('prevents search indexing of unavailable routes', () => {
    // Act
    const output = renderStatic(<NotFound />);

    // Assert
    expect(output.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
});
