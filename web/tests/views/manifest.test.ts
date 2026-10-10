import { describe, expect, it } from 'vitest';
import { viewsSchema } from '@/views/manifest';

describe('viewsSchema', () => {
    it.each(['', 'home', '/%2e%2e/admin', '/items%2f..%2fadmin', '/items/../admin', '/items/*', '/items?view=all'])(
        'rejects unsafe or ambiguous routes: %s',
        (route) => {
            expect(viewsSchema.safeParse([{ path: 'home.jsx', route }]).success).toBe(false);
        }
    );

    it.each(['https://example.com/home.jsx', '/%2e%2e/admin.jsx'])('rejects unsafe view paths: %s', (path) => {
        expect(viewsSchema.safeParse([{ path, route: '/home' }]).success).toBe(false);
    });

    it.each([
        { first: '/home', second: '/home' },
        { first: '/home', second: '/HOME' },
        { first: '/issues/:issueId', second: '/issues/:otherId' },
    ])('rejects colliding routes $first and $second', ({ first, second }) => {
        // Arrange
        const views = [
            { path: 'home.jsx', route: first },
            { path: 'other.jsx', route: second },
        ];

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
                { path: 'issues.jsx', route: '/issues' },
                { path: 'issue.jsx', route: '/issues/:issueId' },
            ]).success
        ).toBe(true);
    });

    it('omits custom titles and icons from the parsed catalog', () => {
        expect(viewsSchema.parse([{ path: 'home.jsx', route: '/home', name: 'Issues', icon: 'list' }])).toEqual([
            { path: 'home.jsx', route: '/home' },
        ]);
    });
});
