import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import source from '@/platform/views/admin/solutions.xml?raw';

/** Renders the XML-backed administrator solutions page. */
export default function AdminSolutions() {
    return (
        <>
            <NoIndex title="Solutions | LongLink" />
            <PlatformView source={source} />
        </>
    );
}
