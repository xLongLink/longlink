import { useParams } from 'react-router';
import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import source from '@/platform/views/orgs/organization.xml?raw';

/** Renders the XML-backed organization solutions page. */
export default function Organization() {
    const { organization = '' } = useParams();

    return (
        <>
            <NoIndex title="Organization Solutions | LongLink" />
            <PlatformView source={source} params={{ organization }} />
        </>
    );
}
