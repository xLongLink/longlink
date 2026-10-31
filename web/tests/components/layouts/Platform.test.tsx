// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import Platform from '@/components/layouts/Platform';

it('selects the longest matching navigation path', () => {
    // Act
    const output = renderStatic(
        <Platform
            action={null}
            tabs={[
                { href: '/admin', label: 'Overview' },
                { href: '/admin/users', label: 'Users' },
            ]}
        >
            Users
        </Platform>,
        '/admin/users/active'
    );

    // Assert
    expect(output.querySelector('[aria-current="page"]')?.textContent).toContain('Users');
});
