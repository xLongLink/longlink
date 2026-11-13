// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../../render';
import Blog from '@/platform/routes/blog/index';

it('lists Why LongLink with a link to the published article', () => {
    // Act
    const output = renderStatic(<Blog />, '/blog/');

    // Assert
    expect(output.querySelector('h1')?.textContent).toBe('Blog');
    expect(output.querySelector('h2')?.textContent).toBe('Why LongLink');
    expect(output.querySelector('a')?.textContent).toBe('Read article');
    expect(output.querySelector('a')?.getAttribute('href')).toBe('/blog/why-longlink/');
});
