import { NoIndex } from '@/components/Seo';
import { PageContainer } from '@/components/PageContainer';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import SettingsPage from '@/platform/views/user/settings.jsx';

/** Renders the native account settings page. */
export default function Settings() {
    const user = useAuthenticatedUser();

    return (
        <PageContainer padding={2}>
            <NoIndex title="Account Settings | LongLink" />
            <SettingsPage key={user.id} user={user} />
        </PageContainer>
    );
}
