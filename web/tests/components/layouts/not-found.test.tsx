// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import NotFound from '@/components/layouts/not-found';

it('explains unavailable routes without allowing search indexing', () => {
    // Act
    const output = renderStatic(<NotFound />);

    // Assert
    expect(output.querySelector('h1')?.textContent).toBe("We can't find that page");
    expect(output.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
});
