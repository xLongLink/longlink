import { viewsSchema } from '@/xml/views';
import { describe, expect, it } from 'vitest';

/** Creates a valid manifest view with optional overrides. */
function view(overrides: Partial<{ path: string; route: string }> = {}) {
    return { path: 'home.xml', route: '/home', ...overrides };
}

describe('viewsSchema', () => {
    it.each(['', 'home', '/%2e%2e/admin', '/items%2f..%2fadmin', '/items/../admin', '/items/*', '/items?view=all'])(
        'rejects unsafe or ambiguous routes: %s',
        (route) => {
            expect(viewsSchema.safeParse([view({ route })]).success).toBe(false);
        }
    );

    it.each(['https://example.com/home.xml', '//example.com/home.xml', '/%2e%2e/admin.xml'])(
        'rejects unsafe view paths: %s',
        (path) => {
            expect(viewsSchema.safeParse([view({ path })]).success).toBe(false);
        }
    );

    it('rejects duplicate routes and allows distinct static routes', () => {
        expect(viewsSchema.safeParse([view(), view({ path: 'other.xml' })]).success).toBe(false);
        expect(viewsSchema.safeParse([view(), view({ route: '/settings' })]).success).toBe(true);
    });

    it('allows a dynamic detail view to share its static list tab', () => {
        expect(
            viewsSchema.safeParse([
                view({ path: 'issues.xml', route: '/issues' }),
                view({ path: 'issue.xml', route: '/issues/:issueId' }),
            ]).success
        ).toBe(true);
    });
});
