import { useParams } from 'react-router';
import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import { PageContainer } from '@/components/PageContainer';
import source from '@/platform/views/orgs/organization.xml?raw';

/** Renders the XML-backed organization solutions page. */
export default function Organization() {
    const { organization = '' } = useParams();

    return (
        <PageContainer gap={8} padding={2}>
            <NoIndex title="Organization Solutions | LongLink" />
            <PlatformView source={source} params={{ organization }} />
        </PageContainer>
    );
}
