import { it, expect } from 'vitest';
import { buildBreadcrumbs } from '@/components/ui/breadcrumbs';

it('keeps cumulative links canonical while decoding readable labels', () => {
    // Act
    const breadcrumbs = buildBreadcrumbs('/docs/order%20history/', { docs: 'Documentation' });

    // Assert
    expect(breadcrumbs).toEqual([
        { label: 'Documentation', href: '/docs/' },
        { label: 'Order History', href: '/docs/order%20history/' }
    ]);
    expect(buildBreadcrumbs('/%invalid/')).toEqual([{ label: 'Invalid', href: '/%invalid/' }]);
});

it.each(['01ad5c1f-a080-4242-8b39-194381c39287', '01AD5C1F-A080-4242-8B39-194381C39287'])(
    'preserves UUID label %s without changing its link',
    (uuid) => {
        // Arrange
        const pathname = `/projects/${uuid}/`;

        // Act
        const breadcrumbs = buildBreadcrumbs(pathname);

        // Assert
        expect(breadcrumbs.at(-1)).toEqual({ label: uuid, href: pathname });
        expect(buildBreadcrumbs(pathname, { [uuid]: 'Project' }).at(-1)?.label).toBe('Project');
    }
);
