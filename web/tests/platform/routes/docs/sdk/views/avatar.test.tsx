// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../../../../render';
import { componentDocumentation } from '@/platform/publications';
import AvatarPage from '@/platform/routes/docs/sdk/views/avatar';
import GeneratedAvatarPage from '@/platform/routes/docs/sdk/views/generated-avatar';

it('renders native and generated avatar documentation through their separate published catalog entries', () => {
    // Exercise the real catalog lookup that otherwise prevents the documentation page from opening.
    const native = renderStatic(<AvatarPage />, '/docs/sdk/views/avatar');
    const generated = renderStatic(<GeneratedAvatarPage />, '/docs/sdk/views/generated-avatar');

    // Keep the native reference and custom artwork guidance attached to their own routes.
    expect(native.querySelector('h1')?.textContent).toBe('Avatar');
    expect(native.querySelector('a[href="https://ui.shadcn.com/docs/components/base/avatar"]')).not.toBeNull();
    expect(generated.querySelector('h1')?.textContent).toBe('GeneratedAvatar');
    expect(componentDocumentation.find((entry) => entry.name === 'GeneratedAvatar')?.slug).toBe('generated-avatar');
});
