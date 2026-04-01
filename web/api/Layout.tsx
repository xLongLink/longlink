import { Outlet, useParams } from 'react-router';
import { useApiData } from '@/hooks/use-data';
import { getAppTabsFromPages, type AppNavigationPage } from '@/lib/navigation';
import ApplicationLayout, { getLoadingApplicationTabs } from '@/layouts/Application';
import OrganizationLayout from '@/layouts/Organization';

type AppMetadata = {
    pages?: AppNavigationPage[];
};

export default function Layout() {
    const { appId } = useParams();

    if (!appId) {
        return (
            <OrganizationLayout>
                <Outlet />
            </OrganizationLayout>
        );
    }

    const appMetadataEndpoint = `/apps/${appId}`;
    const { data: appMetadata, isLoading: isAppMetadataLoading } = useApiData<AppMetadata>(appMetadataEndpoint);

    const tabs = isAppMetadataLoading ? getLoadingApplicationTabs() : getAppTabsFromPages(appMetadata?.pages ?? []);

    const showEmptyAppSection = !isAppMetadataLoading && tabs.length === 0;

    return (
        <ApplicationLayout
            tabs={tabs}
            basePathSuffix={appId}
            isTabsLoading={isAppMetadataLoading}
            showEmptyAppSection={showEmptyAppSection}
        >
            <Outlet />
        </ApplicationLayout>
    );
}
