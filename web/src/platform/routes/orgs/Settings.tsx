import { useParams } from 'react-router';
import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import source from '@/platform/views/orgs/settings.xml?raw';

/** Renders the XML-backed organization settings page. */
export default function OrganizationSettings() {
    const { organization = '' } = useParams();

    return (
        <>
            <NoIndex title="Organization Settings | LongLink" />
            <PlatformView source={source} params={{ organization }} />
        </>
    );
}
