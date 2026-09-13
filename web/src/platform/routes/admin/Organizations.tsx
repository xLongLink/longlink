import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import source from '@/platform/views/admin/organizations.xml?raw';

/** Renders the admin organizations page. */
export default function AdminOrganizations() {
    return (
        <>
            <NoIndex title="Organizations | LongLink" />
            <PlatformView source={source} />
        </>
    );
}
