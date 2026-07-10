import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const metadata = {
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/self-hosted.tsx',
};

export const content = (
    <Stack>
        <Heading id="self-hosted-control-plane" level="h1">
            Self-hosted Control Plane
        </Heading>
        <P>
            Self-hosted mode runs the LongLink control plane and managed application workloads on infrastructure you
            operate. You provide Kubernetes, PostgreSQL, S3-compatible object storage, OIDC, and public origins;
            LongLink registers those backends and provisions organization and application resources through them.
        </P>
        <P>
            The LongLink control-plane container is published at{' '}
            <A href="https://github.com/xLongLink/longlink/pkgs/container/longlink">ghcr.io/xlonglink/longlink</A>.
        </P>
        <Heading id="api-environment-variables" level="h2">
            API Environment Variables
        </Heading>
        <P>
            Configure the API container with these environment variables. Required values are marked in the variable
            column; all other values show their API default.
        </P>
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="bg-muted/50">Variable</TableHead>
                        <TableHead className="bg-muted/50">Purpose</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="space-y-2">
                            <div>
                                <Code>SESSION_KEY</Code>
                            </div>
                            <div className="text-xs text-muted-foreground">Required</div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            Secret key used to sign LongLink browser sessions. Use a high-entropy deployment secret;
                            rotating it invalidates existing sessions.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="space-y-2">
                            <div>
                                <Code>DATABASE_URL</Code>
                            </div>
                            <div className="text-xs text-muted-foreground">Required</div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            Control-plane database URL used by the API and Alembic migrations.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="space-y-2">
                            <div>
                                <Code>DATABASE_SSLMODE</Code>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Default: <Code>require</Code>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            PostgreSQL SSL mode used by registered database backends when the API provisions
                            organization databases and application schemas.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="space-y-2">
                            <div>
                                <Code>OIDC_CLIENT_ID</Code>
                            </div>
                            <div className="text-xs text-muted-foreground">Required</div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            Client ID for the LongLink API client in the OIDC provider.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="space-y-2">
                            <div>
                                <Code>OIDC_CLIENT_SECRET</Code>
                            </div>
                            <div className="text-xs text-muted-foreground">Required</div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            Secret for the LongLink API client in the OIDC provider. Store it as a deployment secret,
                            not in the image.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="space-y-2">
                            <div>
                                <Code>OIDC_ISSUER</Code>
                            </div>
                            <div className="text-xs text-muted-foreground">Required</div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            Issuer URL for the OIDC realm or tenant used for login. Must be HTTPS outside development.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="space-y-2">
                            <div>
                                <Code>OIDC_REDIRECT_URI</Code>
                            </div>
                            <div className="text-xs text-muted-foreground">Required</div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            Callback URL registered with the OIDC provider for LongLink login. Must be HTTPS outside
                            development.
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    </Stack>
);
