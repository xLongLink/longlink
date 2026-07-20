import { A } from '@/components/ui/a';
import { P } from '@/components/ui/p';
import { Code } from '@/components/ui/code';
import { Stack } from '@/components/ui/stack';
import { Heading } from '@/components/ui/heading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const metadata = {
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/self-hosted.tsx',
};

export const content = (
    <Stack>
        <Heading id="self-hosted" level="h1">
            Self-hosted
        </Heading>
        <P>
            Self-hosted mode runs the LongLink Platform and managed application workloads on infrastructure you operate.
            You register Kubernetes compute, PostgreSQL, and S3-compatible object storage independently, then assign one
            registry of each kind to every Organization. The Kubernetes service must implement{' '}
            <Code>type: LoadBalancer</Code>; LongLink derives the public TLS gateway address and reconciles Organization
            and Application resources asynchronously. The cluster CNI must enforce Kubernetes NetworkPolicy because
            Application-to-Application isolation depends on it.
        </P>
        <P>
            The LongLink Platform container is published at{' '}
            <A href="https://github.com/xLongLink/longlink/pkgs/container/longlink">ghcr.io/xlonglink/longlink</A>.
        </P>
        <P>
            Release images carry an immutable <Code>vX.Y.Z</Code> LongLink Platform version. On startup, the reconciler
            migrates active compute targets to that release and records the version only after Kubernetes, database, and
            storage work succeeds. Operation history reports failures and retry progress. Platform releases are
            forward-only for now: a binary older than any recorded compute or Operation release refuses to start.
            Recover by deploying the recorded release or a newer release, or by restoring a database backup that matches
            the older binary.
        </P>
        <Heading id="api-environment-variables" level="h2">
            API Environment Variables
        </Heading>
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="bg-muted/50">Variable</TableHead>
                        <TableHead className="bg-muted/50">Purpose</TableHead>
                    </TableRow>
                    <TableRow>
                        <TableCell className="space-y-2">
                            <div>
                                <Code>RECONCILE_INTERVAL_SECONDS</Code>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Default: <Code>300</Code>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            Interval used to enqueue compute drift repair. Multiple Platform containers may scan safely;
                            the Operation queue coalesces concurrent requests per compute target.
                        </TableCell>
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
                            Control-plane database URL used by the API and Alembic migrations. PostgreSQL URLs preserve
                            <Code>sslmode</Code> when they are normalized for asyncpg.
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
                            PostgreSQL SSL mode used when <Code>DATABASE_URL</Code> omits one and when the API
                            provisions organization databases and application schemas. The same mode is injected into
                            managed LongLink Application database connections.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="space-y-2">
                            <div>
                                <Code>PUBLIC_URL</Code>
                            </div>
                            <div className="text-xs text-muted-foreground">Required</div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            Public web origin used for account verification, password reset, and OAuth completion links.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="space-y-2">
                            <div>
                                <Code>AUTH_REGISTRATION_ENABLED</Code>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Default: <Code>true</Code>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            Enables local email and password registration. Production registration also requires{' '}
                            <Code>SMTP_HOST</Code>; verification and reset messages are logged when running locally
                            without SMTP.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="space-y-2">
                            <div>
                                <Code>GITHUB_CLIENT_ID</Code> and <Code>GITHUB_CLIENT_SECRET</Code>
                            </div>
                            <div className="text-xs text-muted-foreground">Optional</div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            Enables GitHub OAuth login as an additional authentication method.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="space-y-2">
                            <div>
                                <Code>INITIAL_ADMIN_EMAIL</Code>
                            </div>
                            <div className="text-xs text-muted-foreground">Recommended for new installations</div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            Grants the platform administrator role when this exact email address completes registration.
                            The account must still verify ownership of the address before it can sign in.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="space-y-2">
                            <div>
                                <Code>OIDC_ISSUER</Code>, <Code>OIDC_CLIENT_ID</Code>, and{' '}
                                <Code>OIDC_CLIENT_SECRET</Code>
                            </div>
                            <div className="text-xs text-muted-foreground">Optional</div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            Enables a generic OIDC provider for internal SSO or a hosted B2B identity broker. Configure
                            the provider callback as <Code>/auth/oidc/callback</Code> on the LongLink API origin.
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    </Stack>
);
