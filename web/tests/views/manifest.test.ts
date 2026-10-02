import { describe, expect, it } from 'vitest';
import { viewsSchema } from '@/views/manifest';

/** Creates a valid manifest view with optional overrides. */
function view(overrides: Partial<{ path: string; route: string; name: string; icon: string }> = {}) {
    return { path: 'home.jsx', route: '/home', ...overrides };
}

describe('viewsSchema', () => {
    it.each(['', 'home', '/%2e%2e/admin', '/items%2f..%2fadmin', '/items/../admin', '/items/*', '/items?view=all'])(
        'rejects unsafe or ambiguous routes: %s',
        (route) => {
            expect(viewsSchema.safeParse([view({ route })]).success).toBe(false);
        }
    );

    it.each(['https://example.com/home.jsx', '/%2e%2e/admin.jsx'])('rejects unsafe view paths: %s', (path) => {
        expect(viewsSchema.safeParse([view({ path })]).success).toBe(false);
    });

    it('rejects duplicate routes', () => {
        expect(viewsSchema.safeParse([view(), view({ path: 'other.jsx' })])).toMatchObject({
            success: false,
            error: { issues: [{ path: [1, 'route'], message: 'Routes must be unique' }] },
        });
    });

    it('allows a dynamic detail view to share its static list tab', () => {
        expect(
            viewsSchema.safeParse([
                view({ path: 'issues.jsx', route: '/issues' }),
                view({ path: 'issue.jsx', route: '/issues/:issueId' }),
            ]).success
        ).toBe(true);
    });

    it.each([{ name: '  ' }, { icon: '' }])('rejects blank optional display metadata', (metadata) => {
        expect(viewsSchema.safeParse([view(metadata)]).success).toBe(false);
    });

    it('allows nonblank optional display metadata', () => {
        expect(viewsSchema.safeParse([view({ name: 'Issues', icon: 'list' })]).success).toBe(true);
    });
});
