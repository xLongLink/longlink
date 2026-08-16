import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import NotFound from '@/platform/NotFound';
import { platformApiPath } from '@/lib/platform-api';
import PlatformApplicationView from '@/platform/View';
import { useOrganization } from '@/lib/hooks/use-organization';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';

/** Renders one proxy-backed organization application. */
function OrganizationApplicationContent() {
    const { organization = '', application = '' } = useParams();
    const { applications, isLoading, error } = useOrganization(organization);
    const applicationAccess = applications.find((item) => item.slug === application);
    const organizationHref = `/orgs/${organization}`;

    if (isLoading) {
        return <Spinner label="Loading" />;
    }

    if (error?.status === 404 || !applicationAccess) {
        return <NotFound />;
    }

    if (applicationAccess.status === 'creating') {
        return <ApplicationState message="Please try again in a moment." title="Application is being deployed" />;
    }

    if (applicationAccess.status === 'deleting') {
        return (
            <ApplicationState
                action={<Button href={organizationHref} label="Back to organization" variant="primary" />}
                message="This application is unavailable while LongLink removes it."
                title="Application is being deleted"
            />
        );
    }

    return (
        <PlatformApplicationView
            banner={<DevelopmentNotice />}
            basePath={`${organizationHref}/apps/${application}`}
            errorAction={<Button href={organizationHref} label="Back to organization" variant="primary" />}
            pages={platformApiPath(`/applications/${applicationAccess.id}/proxy/pages.json`)}
        />
    );
}

/** Renders one proxy-backed organization application after route authentication. */
export default function OrganizationApplication() {
    return <OrganizationApplicationContent />;
}

/** Renders a Platform-owned application lifecycle state. */
function ApplicationState({ action, message, title }: { action?: ReactNode; message: string; title: string }) {
    return (
        <Center minHeight="calc(100vh - 14rem)" width="100%">
            <Card maxWidth={576} padding={6} width="100%">
                <EmptyState actions={action} description={message} headingLevel={1} role="alert" title={title} />
            </Card>
        </Center>
    );
}
