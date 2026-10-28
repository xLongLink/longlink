// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { ArticleFooter } from '@/components/layouts/Article';

it('does not offer unrelated collection navigation for an unlisted article', () => {
    // Act
    const output = renderStatic(
        <ArticleFooter lastUpdated="2026-10-16" paths={['/docs/first', '/docs/last']} />,
        '/outside'
    );

    // Assert
    expect(output.querySelector('a[href="/docs/first"]')).toBeNull();
    expect(output.querySelector('a[href="/docs/last"]')).toBeNull();
    expect(output.textContent).toContain('16 Oct 2026');
});
