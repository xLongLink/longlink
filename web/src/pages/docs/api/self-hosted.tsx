import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

export const metadata = {
    toc: [{ id: 'api-environment-variables', label: 'API Environment Variables' }],
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/api/self-hosted.tsx',
};

export const content = (
    <Stack gap={5}>
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
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell>
                        <Stack gap={1}>
                            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                                <Code>RECONCILE_INTERVAL_SECONDS</Code>
                                <Text type="supporting">
                                    Default: <Code>300</Code>
                                </Text>
                            </Stack>
                            <Text type="supporting">
                                Interval used to enqueue compute drift repair. Multiple Platform containers may scan
                                safely; the Operation queue coalesces concurrent requests per compute target.
                            </Text>
                        </Stack>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <Stack gap={1}>
                            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                                <Code>SESSION_KEY</Code>
                                <Text type="supporting">Required</Text>
                            </Stack>
                            <Text type="supporting">
                                Secret key used to sign LongLink browser sessions. Use a high-entropy deployment secret;
                                rotating it invalidates existing sessions.
                            </Text>
                        </Stack>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <Stack gap={1}>
                            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                                <Code>DATABASE_URL</Code>
                                <Text type="supporting">Required</Text>
                            </Stack>
                            <Text type="supporting">
                                Control-plane database URL used by the API and Alembic migrations. PostgreSQL URLs
                                preserve <Code>sslmode</Code> when they are normalized for asyncpg.
                            </Text>
                        </Stack>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <Stack gap={1}>
                            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                                <Code>DATABASE_SSLMODE</Code>
                                <Text type="supporting">
                                    Default: <Code>require</Code>
                                </Text>
                            </Stack>
                            <Text type="supporting">
                                PostgreSQL SSL mode used when <Code>DATABASE_URL</Code> omits one and when the API
                                provisions organization databases and application schemas. The same mode is injected
                                into managed LongLink Application database connections.
                            </Text>
                        </Stack>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <Stack gap={1}>
                            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                                <Code>PUBLIC_URL</Code>
                                <Text type="supporting">Required</Text>
                            </Stack>
                            <Text type="supporting">
                                Public web origin used for password reset and OAuth completion links.
                            </Text>
                        </Stack>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <Stack gap={1}>
                            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                                <Code>SMTP_HOST</Code>
                                <Text type="supporting">Optional in local development</Text>
                            </Stack>
                            <Text type="supporting">
                                Sends verification-code and reset emails. Registration is always enabled; verification
                                and reset messages are logged when running locally without SMTP.
                            </Text>
                        </Stack>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <Stack gap={1}>
                            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                                <Text>
                                    <Code>GITHUB_CLIENT_ID</Code> and <Code>GITHUB_CLIENT_SECRET</Code>
                                </Text>
                                <Text type="supporting">Optional</Text>
                            </Stack>
                            <Text type="supporting">
                                Enables GitHub OAuth login as an additional authentication method.
                            </Text>
                        </Stack>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <Stack gap={1}>
                            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                                <Code>INITIAL_ADMIN_EMAIL</Code>
                                <Text type="supporting">Recommended for new installations</Text>
                            </Stack>
                            <Text type="supporting">
                                Grants the platform administrator role when this exact email address completes
                                registration. The account must still verify ownership of the address before it can sign
                                in.
                            </Text>
                        </Stack>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </Stack>
);
