import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

export const metadata = {
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/self-hosted.tsx',
};

export const content = (
    <Stack gap={4}>
        <Heading id="self-hosted" level={1}>
            Self-hosted
        </Heading>
        <Text as="p">
            Self-hosted mode runs the LongLink Platform and managed application workloads on infrastructure you operate.
            You register Kubernetes compute, PostgreSQL, and S3-compatible object storage independently, then assign one
            registry of each kind to every Organization. The Kubernetes service must implement{' '}
            <Code>type: LoadBalancer</Code>; LongLink derives the public TLS gateway address and reconciles Organization
            and Application resources asynchronously. The cluster CNI must enforce Kubernetes NetworkPolicy because
            Application-to-Application isolation depends on it.
        </Text>
        <Text as="p">
            The LongLink Platform container is published at{' '}
            <Link href="https://github.com/xLongLink/longlink/pkgs/container/longlink" isExternalLink type="inherit">
                ghcr.io/xlonglink/longlink
            </Link>
            .
        </Text>
        <Text as="p">
            Release images carry an immutable <Code>vX.Y.Z</Code> LongLink Platform version. On startup, the reconciler
            migrates active compute targets to that release and records the version only after Kubernetes, database, and
            storage work succeeds. Operation history reports failures and retry progress. Platform releases are
            forward-only for now: a binary older than any recorded compute or Operation release refuses to start.
            Recover by deploying the recorded release or a newer release, or by restoring a database backup that matches
            the older binary.
        </Text>
        <Heading id="api-environment-variables" level={2}>
            API Environment Variables
        </Heading>
        <Table<Record<string, unknown>>>
            <TableHeader>
                <TableRow>
                    <TableHeaderCell>Variable</TableHeaderCell>
                    <TableHeaderCell>Purpose</TableHeaderCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell>
                        <div>
                            <Code>RECONCILE_INTERVAL_SECONDS</Code>
                        </div>
                        <Text as="div" type="supporting">
                            Default: <Code>300</Code>
                        </Text>
                    </TableCell>
                    <TableCell>
                        Interval used to enqueue compute drift repair. Multiple Platform containers may scan safely; the
                        Operation queue coalesces concurrent requests per compute target.
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <div>
                            <Code>SESSION_KEY</Code>
                        </div>
                        <Text as="div" type="supporting">
                            Required
                        </Text>
                    </TableCell>
                    <TableCell>
                        Secret key used to sign LongLink browser sessions. Use a high-entropy deployment secret;
                        rotating it invalidates existing sessions.
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <div>
                            <Code>DATABASE_URL</Code>
                        </div>
                        <Text as="div" type="supporting">
                            Required
                        </Text>
                    </TableCell>
                    <TableCell>
                        Control-plane database URL used by the API and Alembic migrations. PostgreSQL URLs preserve
                        <Code>sslmode</Code> when they are normalized for asyncpg.
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <div>
                            <Code>DATABASE_SSLMODE</Code>
                        </div>
                        <Text as="div" type="supporting">
                            Default: <Code>require</Code>
                        </Text>
                    </TableCell>
                    <TableCell>
                        PostgreSQL SSL mode used when <Code>DATABASE_URL</Code> omits one and when the API provisions
                        organization databases and application schemas. The same mode is injected into managed LongLink
                        Application database connections.
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <div>
                            <Code>PUBLIC_URL</Code>
                        </div>
                        <Text as="div" type="supporting">
                            Required
                        </Text>
                    </TableCell>
                    <TableCell>
                        Public web origin used for account verification, password reset, and OAuth completion links.
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <div>
                            <Code>AUTH_REGISTRATION_ENABLED</Code>
                        </div>
                        <Text as="div" type="supporting">
                            Default: <Code>true</Code>
                        </Text>
                    </TableCell>
                    <TableCell>
                        Enables local email and password registration. Production registration also requires{' '}
                        <Code>SMTP_HOST</Code>; verification and reset messages are logged when running locally without
                        SMTP.
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <div>
                            <Code>GITHUB_CLIENT_ID</Code> and <Code>GITHUB_CLIENT_SECRET</Code>
                        </div>
                        <Text as="div" type="supporting">
                            Optional
                        </Text>
                    </TableCell>
                    <TableCell>Enables GitHub OAuth login as an additional authentication method.</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <div>
                            <Code>INITIAL_ADMIN_EMAIL</Code>
                        </div>
                        <Text as="div" type="supporting">
                            Recommended for new installations
                        </Text>
                    </TableCell>
                    <TableCell>
                        Grants the platform administrator role when this exact email address completes registration. The
                        account must still verify ownership of the address before it can sign in.
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <div>
                            <Code>OIDC_ISSUER</Code>, <Code>OIDC_CLIENT_ID</Code>, and <Code>OIDC_CLIENT_SECRET</Code>
                        </div>
                        <Text as="div" type="supporting">
                            Optional
                        </Text>
                    </TableCell>
                    <TableCell>
                        Enables a generic OIDC provider for internal SSO or a hosted B2B identity broker. Configure the
                        provider callback as <Code>/auth/oidc/callback</Code> on the LongLink API origin.
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </Stack>
);
