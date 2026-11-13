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

    // Prefer the specific Views section while preserving its existing SDK URLs.
    const activeGroup =
        documentationNavigation
            .filter(({ path }) => pagePath === path || pagePath.startsWith(`${path}/`))
            .sort((left, right) => right.path.length - left.path.length)[0] ?? documentationNavigation[0];

    const sections = [documentationIntroduction, ...activeGroup.sections];

    return (
        <Publication
            navigation={<PublicationSectionLinks groups={documentationNavigation} activePath={activeGroup.path} />}
            sideNav={
                <PublicationNavigation label="Documentation navigation">
                    {sections.map((section) => (
                        <PublicationNavigationSection key={section.title} title={section.title}>
                            {section.pages.map((page) =>
                                page.children?.length ? (
                                    <PublicationNavigationSection key={page.path} title={page.label}>
                                        {page.children.map((child) => (
                                            <PublicationNavigationItem
                                                key={child.path}
                                                page={child}
                                                pagePath={pagePath}
                                                hash={hash}
                                            />
                                        ))}
                                    </PublicationNavigationSection>
                                ) : (
                                    <PublicationNavigationItem
                                        key={page.path}
                                        page={page}
                                        pagePath={pagePath}
                                        hash={hash}
                                    />
                                )
                            )}
                        </PublicationNavigationSection>
                    ))}
                </PublicationNavigation>
            }
        />
    );
}
