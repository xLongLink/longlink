import { useParams } from 'react-router';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { TopNav } from '@astryxdesign/core/TopNav';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { ProfileMenu } from '@/components/Profile';
import TopLayout from '@/components/layouts/TopLayout';
import NotFoundLayout from '@/components/layouts/NotFound';
import { XmlApplication } from '@/xml/runtime/Application';
import { PageError, PageLoading } from '@/components/Utils';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
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

    const topNav = (
        <TopNav
            className="min-h-11 px-7"
            endContent={<ProfileMenu user={user} />}
            heading={<PageBreadcrumb applicationName={applicationAccess.name} />}
            label="Main navigation"
        />
    );

    if (applicationAccess.status === 'creating' || applicationAccess.status === 'deleting') {
        return (
            <TopLayout topMenu={topNav}>
                <Center minHeight="calc(100vh - 14rem)" width="100%">
                    <Card maxWidth={576} padding={6} width="100%">
                        <EmptyState
                            actions={
                                applicationAccess.status === 'deleting' ? (
                                    <Button
                                        href={`/orgs/${organization}`}
                                        label="Back to organization"
                                        variant="primary"
                                    />
                                ) : undefined
                            }
                            description={
                                applicationAccess.status === 'creating'
                                    ? 'Please try again in a moment.'
                                    : 'This application is unavailable while LongLink removes it.'
                            }
                            headingLevel={1}
                            role="alert"
                            title={
                                applicationAccess.status === 'creating'
                                    ? 'Application is being deployed'
                                    : 'Application is being deleted'
                            }
                        />
                    </Card>
                </Center>
            </TopLayout>
        );
    }

    const navigationBaseUrl = `/orgs/${organization}/apps/${application}`;
    const pagesUrl = `/api/v1/applications/${applicationAccess.id}/proxy/pages.json`;

    return (
        <XmlApplication
            navigationBaseUrl={navigationBaseUrl}
            pagesUrl={pagesUrl}
            requestBaseUrl={`/api/v1/applications/${applicationAccess.id}/proxy/`}
            topNav={topNav}
        />
    );
}
