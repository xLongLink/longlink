// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { MenuNavigationContext } from '@/components/ui/contexts';
import { Menu, MenuSection, MenuItem } from '@/components/ui/Menu';

it('selects the first authored item before fragment navigation', () => {
    // Act
    const output = renderStatic(
        <MenuNavigationContext value={{ hash: '', select: () => undefined }}>
            <Menu>
                <MenuSection title="Workspace">
                    <MenuItem label="Orders">Order content</MenuItem>
                    <MenuItem label="Archive">Archive content</MenuItem>
                </MenuSection>
            </Menu>
        </MenuNavigationContext>
    );

    // Assert
    expect(output.textContent).toContain('Order content');
    expect(output.textContent).not.toContain('Archive content');
});
