// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../render';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';

it('uses the resolved Solution name rather than its slug for the current breadcrumb', () => {
    // Act
    const output = renderStatic(<PageBreadcrumb solutionName="Order dashboard" />, '/orgs/acme/solutions/orders');

    // Assert
    expect(output.querySelector('[aria-current="page"]')?.textContent).toContain('Order dashboard');
    expect(output.textContent).toContain('Acme');
    expect(output.querySelector('button')).toBeNull();
});
