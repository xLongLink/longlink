import Publication from './publication';
import { useLocation } from 'react-router';
import { PublicationNavigation } from './publication-navigation';
import { legalPages, brandingPages } from '@/platform/publications';

const sections = [
    { title: 'Legal', pages: legalPages },
    { title: 'Branding', pages: brandingPages, trailingSlash: false }
];

/** Renders legal and branding pages with the public article layout. */
export default function Legal() {
    const { pathname } = useLocation();
    const pagePath = pathname.replace(/\/+$/, '') || '/';

    return (
        <Publication
            className="[&_.publication-sidebar]:h-fit! [&_.publication-sidebar]:max-h-dvh"
            sideNav={
                <PublicationNavigation
                    label="Legal and branding navigation"
                    sections={sections}
                    currentPath={pagePath}
                />
            }
        />
    );
}
