import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import { PageContainer } from '@/components/PageContainer';
import source from '@/platform/views/user/organizations.xml?raw';

/** Renders the organizations landing page for the authenticated user. */
export default function Organizations() {
    return (
        <PageContainer padding={2}>
            <NoIndex title="Organizations | LongLink" />
            <PlatformView source={source} />
        </PageContainer>
    );
}
