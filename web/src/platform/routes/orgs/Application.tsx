import { useParams } from 'react-router';
import { Card } from '@astryxdesign/core/Card';
import { ProfileMenu } from '@/components/Profile';
import Platform from '@/platform/layouts/Platform';
import { Center } from '@astryxdesign/core/Center';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { ApplicationRuntime } from '@/components/Application';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';
import { useOrganizationApplications } from '@/lib/hooks/use-organization';

/** Renders one proxy-backed organization application after route authentication. */
export default function OrganizationApplication() {
    const { organization = '', application = '' } = useParams();
    const user = useAuthenticatedUser();
    const { applications, isLoading, error } = useOrganizationApplications(organization);
    const applicationAccess = applications.find((item) => item.slug === application);

    if (isLoading) {
        return <PageLoading label="Loading application" />;
    }

    if (error?.status === 404) {
        return <NotFoundLayout />;
    }

    if (error && !applicationAccess) {
        return <PageError description="We couldn't load this application." title="Unable to load application" />;
    }

    if (!applicationAccess) {
        return <NotFoundLayout />;
    }

    const action = <ProfileMenu user={user} />;
    const breadcrumb = <PageBreadcrumb applicationName={applicationAccess.name} />;

    if (applicationAccess.status === 'creating') {
        return (
            <Platform action={action} breadcrumb={breadcrumb} tabs={[]}>
                <Center minHeight="calc(100vh - 14rem)" width="100%">
                    <Card maxWidth={576} padding={6} width="100%">
                        <EmptyState
                            description="Please try again in a moment."
                            headingLevel={1}
                            role="alert"
                            title="Application is being deployed"
                        />
                    </Card>
                </Center>
            </Platform>
        );
    }

    return (
        <ApplicationRuntime
            navigationBaseUrl={`/orgs/${organization}/apps/${application}`}
            pagesUrl={`/api/v1/applications/${applicationAccess.id}/proxy/pages.json`}
            requestBaseUrl={`/api/v1/applications/${applicationAccess.id}/proxy/`}
        >
            {({ content, tabs }) => (
                <Platform action={action} breadcrumb={breadcrumb} tabs={tabs}>
                    <PageContainer minHeight="100%">{content}</PageContainer>
                </Platform>
            )}
        </ApplicationRuntime>
    );
}
