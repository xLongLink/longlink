import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import source from '@/platform/views/admin/compute.xml?raw';

/** Renders the XML-backed administrator compute page. */
export default function AdminCompute() {
    return (
        <>
            <NoIndex title="Compute | LongLink" />
            <PlatformView source={source} />
        </>
    );
}
