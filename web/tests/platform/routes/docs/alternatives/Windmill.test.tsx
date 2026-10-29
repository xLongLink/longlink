// @vitest-environment happy-dom
import { documentationPage, renderStatic } from '../../../../render';
import { expect, it } from 'vitest';
import Page from '@/platform/routes/docs/alternatives/Windmill';

documentationPage(Page, 'LongLink vs Windmill', '/docs/alternatives/windmill');

it('compares architecture and offers supporting product documentation', () => {
    const output = renderStatic(<Page />, '/docs/alternatives/windmill');
    expect(output.textContent).toContain('FastAPI');
    expect(output.textContent).toContain('React or Svelte');
    expect(output.querySelector('a[href="https://www.windmill.dev/docs/intro"]')).not.toBeNull();
});
