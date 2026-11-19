import Publication from './publication';
import { useLocation } from 'react-router';
import { Page } from '@/components/ui/page';
import { PublicationSectionLinks } from './publication-navigation';

const groups = [
    { path: '/explore', label: 'Solutions' },
    { path: '/explore/catalog', label: 'Catalog' }
];

export default function Explore() {
    const { pathname } = useLocation();
    const activePath = pathname.replace(/\/+$/, '');

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
