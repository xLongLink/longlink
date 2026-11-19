import Publication from './publication';
import { useLocation } from 'react-router';
import { documentationNavigation } from '@/platform/publications';
import { PublicationNavigation, PublicationSectionLinks } from './publication-navigation';

/** Renders documentation with section navigation, article, and outline columns. */
export default function Documentation() {
    const { pathname, hash } = useLocation();
    const pagePath = pathname.replace(/\/+$/, '') || '/';

    // Prefer the specific Views section while preserving its existing SDK URLs.
    const activeGroup =
        documentationNavigation
            .filter(({ path }) => pagePath === path || pagePath.startsWith(`${path}/`))
            .sort((left, right) => right.path.length - left.path.length)[0] ?? documentationNavigation[0];

    return (
        <Publication
            navigation={<PublicationSectionLinks groups={documentationNavigation} activePath={activeGroup.path} />}
            sideNav={
                <PublicationNavigation
                    label="Documentation navigation"
                    sections={activeGroup.sections}
                    currentPath={`${pagePath}${hash}`}
                />
            }
        />
    );
}
