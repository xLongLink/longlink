import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import source from '@/platform/views/admin/users.xml?raw';

/** Renders the admin users page. */
export default function AdminUsers() {
    return (
        <>
            <NoIndex title="Users | LongLink" />
            <PlatformView source={source} />
        </>
    );
}
