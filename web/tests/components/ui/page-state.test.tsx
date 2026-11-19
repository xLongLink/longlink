// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { PageError, PageLoading } from '@/components/ui/utils';

it('exposes named loading status and a failure heading within its status region', () => {
    // Act
    const loading = renderStatic(<PageLoading label="Loading View" />);
    const failure = renderStatic(
        <PageError title="Unable to load this View" description="Runtime assets are unavailable." />
    );

    // Assert
    expect(loading.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Loading View');
    expect(failure.querySelector('[role="status"] h1')?.textContent).toBe('Unable to load this View');
    expect(failure.querySelector('[role="status"]')?.textContent).toContain('Runtime assets are unavailable.');
});
