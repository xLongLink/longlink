import { Code } from '@astryxdesign/core/Code';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';

export const metadata = {
    toc: [{ id: 'api-environment-variables', label: 'API Environment Variables' }],
    lastUpdated: '2026-07-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/api/self-hosted.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="self-hosted" level={1}>
            Self-hosted
        </Heading>
        <Text as="p">
            Self-hosted mode runs the LongLink Platform and managed application workloads on infrastructure you operate.
            You register Kubernetes compute, PostgreSQL, and Exoscale SOS object storage independently, then assign one
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
            Release images carry an immutable <Code>vX.Y.Z</Code> LongLink Platform version. Desired-state changes
            enqueue compute reconciliation Operations for the current release, which is recorded only after Kubernetes,
            database, and storage work succeeds. Operation history reports failures and retry progress. Platform
            releases are forward-only for now: a binary older than any recorded compute or Operation release refuses to
            start. Recover by deploying the recorded release or a newer release, or by restoring a database backup that
            matches the older binary.
        </Text>
        <Heading id="api-environment-variables" level={2}>
            API Environment Variables
        </Heading>
        <Table<Record<string, unknown>> density="compact">
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
                                preserve <Code>sslmode</Code> when they are normalized for asyncpg, and default to{' '}
                                <Code>require</Code> when no SSL mode is present.
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
                                Public web origin used for registration and password reset links.
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
                                Sends registration-link and password-reset emails. Registration requests create no user
                                record until the recipient verifies the link and completes account setup. Messages are
                                logged when running locally without SMTP.
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
                                Grants the platform administrator role when this exact email address verifies the
                                registration link and creates its authenticated account.
                            </Text>
                        </Stack>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </Stack>
);
