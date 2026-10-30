// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import Settings from '@/platform/routes/orgs/Settings';
import { renderPlatform, membership } from '../../render';

it('renders General without loading inactive billing or registry resources', () => {
    // Act
    const output = renderPlatform(<Settings />, '/orgs/acme/settings', [], '/orgs/:organization/settings', {
        ...membership,
        tags: [],
        activeTag: undefined,
    });

    // Assert
    expect(output.textContent).toContain('Acme');
    expect(output.textContent).toContain('General');
    expect(output.textContent).toContain('Tabs');
    expect(output.querySelector('table')).not.toBeNull();
});
