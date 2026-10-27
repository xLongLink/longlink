import { Link, type LinkProps } from 'react-router';
import { SideNavItem as AstryxSideNavItem, type SideNavItemProps } from '@astryxdesign/core/SideNav';

/** Pushes navigation selections into router history. */
function RouterLink(props: LinkProps) {
    return <Link {...props} replace={false} />;
}

/** Applies LongLink's router navigation policy to themed navigation items. */
export function SideNavItem(props: Omit<SideNavItemProps, 'as'>) {
    return <AstryxSideNavItem {...props} as={RouterLink} />;
}
