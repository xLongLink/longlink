// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../../../../render';
import { componentDocumentation } from '@/platform/publications';
import AvatarPage from '@/platform/routes/docs/sdk/views/avatar';

it('renders the LongLink avatar example without exposing implementation provenance', () => {
    const page = renderStatic(<AvatarPage />, '/docs/sdk/views/avatar');

    // The public Avatar renders deterministic artwork without authored image or fallback children.
    expect(page.querySelector('h1')?.textContent).toBe('Avatar');
    expect(page.querySelector('[data-slot="avatar"]')?.getAttribute('aria-label')).toBe('Ada Lovelace');
    expect(page.querySelector('img')?.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
    expect(page.querySelector('a[href="https://ui.shadcn.com/docs/components/base/avatar"]')).toBeNull();
    expect(page.textContent).not.toContain('Custom:');
    expect(componentDocumentation.find((entry) => entry.name === 'Avatar')?.slug).toBe('avatar');
});
