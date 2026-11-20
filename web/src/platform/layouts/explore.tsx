import Publication from './publication';
import { useLocation } from 'react-router';
import { Page } from '@/components/ui/page';
import { PublicationSectionLinks } from './publication-navigation';

const groups = [
    { path: '/explore/solutions', label: 'Solutions' },
    { path: '/explore/catalog', label: 'Catalog' }
];

export default function Explore() {
    const { pathname } = useLocation();
    const normalizedPath = pathname.replace(/\/+$/, '');
    const activePath = normalizedPath === '/explore' ? '/explore/solutions' : normalizedPath;

    return (
        <Page title="Explore | LongLink" description="Explore LongLink solutions and catalog.">
            <Publication
                navigation={
                    <PublicationSectionLinks groups={groups} activePath={activePath} label="Explore sections" />
                }
            />
        </Page>
    );
}
