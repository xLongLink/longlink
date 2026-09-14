import { useParams } from 'react-router';
import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import { PageContainer } from '@/components/PageContainer';
import source from '@/platform/views/orgs/settings.xml?raw';

/** Renders the XML-backed organization settings page. */
export default function OrganizationSettings() {
    const { organization = '' } = useParams();

    return (
        <PageContainer gap={8} padding={2}>
            <NoIndex title="Organization Settings | LongLink" />
            <PlatformView source={source} params={{ organization }} />
        </PageContainer>
    );
}
