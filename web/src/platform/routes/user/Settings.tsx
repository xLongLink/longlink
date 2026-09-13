import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import { PageContainer } from '@/components/PageContainer';
import source from '@/platform/views/user/settings.xml?raw';

/** Renders the XML-backed account settings page. */
export default function Settings() {
    return (
        <PageContainer padding={2}>
            <NoIndex title="Account Settings | LongLink" />
            <PlatformView source={source} />
        </PageContainer>
    );
}
