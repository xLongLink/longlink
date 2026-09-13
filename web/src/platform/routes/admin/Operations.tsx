import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import source from '@/platform/views/admin/operations.xml?raw';

/** Renders the XML-backed administrator operations page. */
export default function AdminOperations() {
    return (
        <>
            <NoIndex title="Operations | LongLink" />
            <PlatformView source={source} />
        </>
    );
}
