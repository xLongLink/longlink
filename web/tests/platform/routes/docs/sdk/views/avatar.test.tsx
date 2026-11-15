// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../../../../render';
import { componentDocumentation } from '@/platform/publications';
import AvatarPage from '@/platform/routes/docs/sdk/views/avatar';
import GeneratedAvatarPage from '@/platform/routes/docs/sdk/views/generated-avatar';

it('renders native and generated avatar documentation through their separate published catalog entries', () => {
    // Render both published routes using their real component examples.
    const native = renderStatic(<AvatarPage />, '/docs/sdk/views/avatar');
    const generated = renderStatic(<GeneratedAvatarPage />, '/docs/sdk/views/generated-avatar');

    // Keep the separate API pages without exposing implementation provenance.
    expect(native.querySelector('h1')?.textContent).toBe('Avatar');
    expect(native.querySelector('a[href="https://ui.shadcn.com/docs/components/base/avatar"]')).toBeNull();
    expect(generated.querySelector('h1')?.textContent).toBe('GeneratedAvatar');
    expect(generated.textContent).not.toContain('Custom:');
    expect(generated.textContent).not.toContain('Generates deterministic DiceBear artwork');
    expect(componentDocumentation.find((entry) => entry.name === 'GeneratedAvatar')?.slug).toBe('generated-avatar');
});
