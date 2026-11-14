// @vitest-environment happy-dom
import { z } from 'zod';
import { it, expect } from 'vitest';
import { createElement } from 'react';
import { renderStatic } from '../../render';
import { useApi } from '@/lib/hooks/use-api';

it('keeps responses for distinct full request paths separate', () => {
    // Arrange
    function Probe() {
        const [page] = useApi('/api/items?page=2', z.object({ name: z.string() }));

        return page.name;
    }

    // Act
    const output = renderStatic(createElement(Probe), '/', [
        ['/api/items?page=1', { name: 'First' }],
        ['/api/items?page=2', { name: 'Second' }]
    ]);

    // Assert
    expect(output.textContent).toBe('Second');
});
