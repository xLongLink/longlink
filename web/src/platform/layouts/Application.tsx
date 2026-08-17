import { RuntimeApplicationView } from '@/application/routes/Application';

/** Renders a platform application from its authenticated proxy manifest. */
export function ApplicationLayout({ applicationId, basePath }: { applicationId: string; basePath: string }) {
    return (
        <RuntimeApplicationView basePath={basePath} pages={`/api/v1/applications/${applicationId}/proxy/pages.json`} />
    );
}
