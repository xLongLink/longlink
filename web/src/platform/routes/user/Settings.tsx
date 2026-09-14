import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import { PageContainer } from '@/components/PageContainer';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import source from '@/platform/views/user/settings.xml?raw';

/** Renders the XML-backed account settings page. */
export default function Settings() {
    const user = useAuthenticatedUser();

    return (
        <PageContainer padding={2}>
            <NoIndex title="Account Settings | LongLink" />
            <PlatformView
                source={source}
                params={{ userAvatar: user.avatar, userEmail: user.email, userName: user.name }}
            />
        </PageContainer>
    );
}
