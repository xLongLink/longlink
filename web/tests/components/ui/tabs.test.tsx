// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { Tabs } from '@/components/longlink/layout/tabs';

it('defaults to the first enabled item when no selection is supplied', () => {
    // Act
    const output = renderStatic(
        <Tabs
            items={[
                { value: 'restricted', label: 'Restricted', disabled: true },
                { value: 'orders', label: 'Orders', content: 'Order list' }
            ]}
        />
    );

    // Assert
    expect(output.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('Orders');
    expect(output.querySelector('[role="tabpanel"]')?.textContent).toBe('Order list');
});
