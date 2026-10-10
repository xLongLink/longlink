import { describe, expect, it } from 'vitest';
import { viewsSchema } from '@/views/manifest';

/** Creates a valid manifest view with optional overrides. */
function view(overrides: Partial<{ path: string; route: string }> = {}) {
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

    it.each([
        { first: '/home', second: '/home' },
        { first: '/home', second: '/HOME' },
        { first: '/issues/:issueId', second: '/issues/:otherId' },
    ])('rejects colliding routes $first and $second', ({ first, second }) => {
        // Arrange
        const views = [view({ route: first }), view({ path: 'other.jsx', route: second })];

        // Act
        const result = viewsSchema.safeParse(views);

        // Assert
        expect(result).toMatchObject({
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

    it('omits custom titles and icons from the parsed catalog', () => {
        expect(viewsSchema.parse([{ ...view(), name: 'Issues', icon: 'list' }])).toEqual([
            { path: 'home.jsx', route: '/home' },
        ]);
    });
});
