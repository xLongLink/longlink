import { useLocation } from 'react-router';
import Publication from '@/components/layouts/Publication';
import { legalPages, brandingPages } from '@/platform/publications';
import {
    PublicationNavigation,
    PublicationNavigationItem,
    PublicationNavigationSection
} from './PublicationNavigation';

/** Renders legal and branding pages with the public article layout. */
export default function Legal() {
    const { pathname } = useLocation();
    const pagePath = pathname.replace(/\/+$/, '') || '/';

    return (
        <Publication
            className="min-h-0! [&_.publication-sidebar]:h-fit! [&_.publication-sidebar]:max-h-dvh"
            sideNav={
                <PublicationNavigation label="Legal and branding navigation">
                    <PublicationNavigationSection title="Legal">
                        {legalPages.map((page) => (
                            <PublicationNavigationItem key={page.path} page={page} pagePath={pagePath} />
                        ))}
                    </PublicationNavigationSection>
                    <PublicationNavigationSection title="Branding">
                        {brandingPages.map((page) => (
                            <PublicationNavigationItem
                                key={page.path}
                                page={page}
                                pagePath={pagePath}
                                trailingSlash={false}
                            />
                        ))}
                    </PublicationNavigationSection>
                </PublicationNavigation>
            }
        />
    );
}
