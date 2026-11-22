import * as icons from '@/lib/icons';
// @vitest-environment happy-dom
import { withMounted } from '../../render';
import { it, expect, vi, afterEach } from 'vitest';
import { Icon } from '@/components/longlink/display/icon';

afterEach(() => {
    vi.restoreAllMocks();
});

it('keeps a decorative warning glyph after deferred loading fails', async () => {
    // A network failure must leave a stable fallback, not an unlabeled image or a broken action.
    vi.spyOn(icons, 'load').mockRejectedValue(new Error('Icon unavailable'));

    await withMounted(<Icon icon="search" size="md" />, async (output) => {
        await vi.waitFor(
            () =>
                expect(output.querySelector('svg')?.classList.contains('lucide-triangle-exclamation-point')).toBe(true),
            { timeout: 3000 }
        );
        expect(output.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    });
});
