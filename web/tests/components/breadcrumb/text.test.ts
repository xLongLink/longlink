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
