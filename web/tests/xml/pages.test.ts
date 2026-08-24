import { pagesSchema } from '@/xml/pages';
import { describe, expect, it } from 'vitest';

/** Creates a valid manifest page with optional overrides. */
function page(overrides: Partial<{ path: string; route: string; tab: string }> = {}) {
    return { path: 'home.xml', route: '/home', tab: 'home', ...overrides };
}

describe('pagesSchema', () => {
    it.each(['', 'home', '/%2e%2e/admin', '/items%2f..%2fadmin', '/items/../admin', '/items/*', '/items?view=all'])(
        'rejects unsafe or ambiguous routes: %s',
        (route) => {
            expect(pagesSchema.safeParse([page({ route })]).success).toBe(false);
        }
    );

    it.each(['https://example.com/home.xml', '//example.com/home.xml', '/%2e%2e/admin.xml'])(
        'rejects unsafe page paths: %s',
        (path) => {
            expect(pagesSchema.safeParse([page({ path })]).success).toBe(false);
        }
    );

    it('rejects duplicate routes and static navigation tabs', () => {
        expect(pagesSchema.safeParse([page(), page({ tab: 'other' })]).success).toBe(false);
        expect(pagesSchema.safeParse([page(), page({ route: '/settings', tab: 'home' })]).success).toBe(false);
    });

    it('allows a dynamic detail page to share its static list tab', () => {
        expect(
            pagesSchema.safeParse([
                page({ path: 'issues.xml', route: '/issues', tab: 'issues' }),
                page({ path: 'issue.xml', route: '/issues/:issueId', tab: 'issues' }),
            ]).success
        ).toBe(true);
    });
});
