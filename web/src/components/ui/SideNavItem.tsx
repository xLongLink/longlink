import { Link } from 'react-router';
import { SideNavItem as AstryxSideNavItem, type SideNavItemProps } from '@astryxdesign/core/SideNav';

/** Applies LongLink's router navigation policy to themed navigation items. */
export function SideNavItem(props: Omit<SideNavItemProps, 'as'>) {
    return <AstryxSideNavItem {...props} as={Link} />;
}
