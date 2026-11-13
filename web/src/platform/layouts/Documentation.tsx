import { useLocation } from 'react-router';
import Publication from '@/components/layouts/Publication';
import { documentationIntroduction, documentationNavigation } from '@/platform/publications';
import {
    PublicationNavigation,
    PublicationNavigationItem,
    PublicationNavigationSection,
    PublicationSectionLinks,
} from './PublicationNavigation';

/** Renders documentation with section navigation, article, and outline columns. */
export default function Documentation() {
    const { pathname, hash } = useLocation();
    const pagePath = pathname.replace(/\/+$/, '') || '/';

    // Resolve the tab and its sidebar sections from the same navigation hierarchy.
    const activeGroup =
        documentationNavigation.find(({ path }) => pagePath === path || pagePath.startsWith(`${path}/`)) ??
        documentationNavigation[0];

    const sections = [documentationIntroduction, ...activeGroup.sections];

    return (
        <Publication
            navigation={<PublicationSectionLinks groups={documentationNavigation} activePath={activeGroup.path} />}
            sideNav={
                <PublicationNavigation label="Documentation navigation">
                    {sections.map((section) => (
                        <PublicationNavigationSection key={section.title} title={section.title}>
                            {section.pages.map((page) => (
                                <PublicationNavigationItem
                                    key={page.path}
                                    page={page}
                                    pagePath={pagePath}
                                    hash={hash}
                                />
                            ))}
                        </PublicationNavigationSection>
                    ))}
                </PublicationNavigation>
            }
        />
    );
}
