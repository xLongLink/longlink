// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import Layout from '@/platform/layouts/Documentation';

it('selects Platform navigation for API documentation', () => {
    // Act
    const output = renderStatic(<Layout />, '/docs/api');

    // Assert
    expect(output.querySelector('[aria-label="Documentation sections"] [aria-current="true"]')?.textContent).toContain(
        'Platform'
    );
    expect(output.querySelector('[aria-label="Documentation navigation"] a[href="/docs/sdk/storage/"]')).toBeNull();
});

it('selects Alternatives and lists its comparison pages without other sections', () => {
    // Act
    const output = renderStatic(<Layout />, '/docs/alternatives/');

    // Assert
    const activeTab = output.querySelector('[aria-label="Documentation sections"] [aria-current="true"]');
    expect(activeTab?.textContent).toContain('Alternatives');
    expect(activeTab?.getAttribute('href')).toBe('/docs/alternatives/');
    expect(
        Array.from(output.querySelectorAll('[aria-label="Documentation navigation"] a'), (link) =>
            link.getAttribute('href')
        )
    ).toEqual(['/docs/', '/docs/alternatives/windmill/']);
});
