// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderPlatform } from '../render';
import Layout from '@/platform/layouts/user';

it('keeps ordinary account navigation separate from administration', () => {
    // Act
    const output = renderPlatform(<Layout />, '/user/settings');

    // Assert
    expect(output.querySelector('a[href="/user/settings"]')).not.toBeNull();
    expect(output.querySelector('a[href="/admin/users"]')).toBeNull();
});
