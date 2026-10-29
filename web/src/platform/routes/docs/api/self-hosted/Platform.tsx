import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Table, proportional } from '@/components/ui/Table';
import { DocumentationArticle } from '@/components/layouts/Article';

const article = {
    title: 'Platform | LongLink Self Hosted Documentation',
    description: 'Install the LongLink Platform Docker image and configure environment variables.',
    toc: [
        { id: 'platform', label: 'Platform', level: 1 },
        { id: 'environment', label: 'Environment variables', level: 2 },
    ],
    lastUpdated: '2026-10-29',
    editUrl:
        'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/self-hosted/Platform.tsx',
};

/** Introduces self-hosted Platform installation. */
export default function Platform() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="platform" level={1}>
                    Platform
                </Heading>
                <Text as="p">
                    The Platform API and web interface are released as a{' '}
                    <Link href="https://ghcr.io/xlonglink/longlink" isExternalLink>
                        single container image
                    </Link>
                    . Provide a separate PostgreSQL database, an SMTP server, and an HTTPS reverse proxy for public
                    access. Compute runs your Solutions and is installed separately.
                </Text>
                <CodeBlock language="bash" code="docker run ghcr.io/xlonglink/longlink:latest" />
                <Stack as="section" gap={3}>
                    <Heading id="environment" level={2}>
                        Environment variables
                    </Heading>
                    <Text as="p">
                        See the{' '}
                        <Link href="https://github.com/xLongLink/longlink/blob/main/api/.env.sample" isExternalLink>
                            environment example
                        </Link>{' '}
                        for their settings.
                    </Text>
                    <Table
                        data={[
                            {
                                name: 'PUBLIC_URL',
                                type: 'string · default: http://localhost:5173',
                                description:
                                    'Public HTTPS origin without a path. HTTP is allowed only for loopback development.',
                            },
                            {
                                name: 'SESSION_KEY',
                                type: 'string · required',
                                description:
                                    'Session signing secret with at least 32 characters. Keep stable across restarts and replicas.',
                            },
                            {
                                name: 'ENCRYPTION_KEY',
                                type: 'string · required',
                                description:
                                    'Encrypts stored infrastructure credentials. At least 32 characters; retain and back up this key.',
                            },
                            {
                                name: 'ADMIN_EMAIL',
                                type: 'email · required',
                                description:
                                    'Platform administrator email. The sole administrator is reconciled on startup.',
                            },
                            {
                                name: 'ADMIN_PASSWORD',
                                type: 'string · required',
                                description:
                                    'Platform administrator password, reconciled on startup. Use a strong password.',
                            },
                            {
                                name: 'DATABASE_URL',
                                type: 'string · required',
                                description:
                                    'Platform database connection URL, including its asynchronous driver, credentials, and database name.',
                            },
                            {
                                name: 'SMTP_HOST',
                                type: 'string · required',
                                description: 'SMTP server for account verification and password reset emails.',
                            },
                            {
                                name: 'SMTP_PORT',
                                type: 'integer · default: 587',
                                description: 'SMTP server port, from 1 to 65535.',
                            },
                            {
                                name: 'SMTP_TRANSPORT',
                                type: '"plain" | "starttls" | "tls" · default: starttls',
                                description: 'SMTP connection security. Use starttls or tls for hosted deployments.',
                            },
                            {
                                name: 'SMTP_FROM',
                                type: 'email · default: no-reply@longlink.dev',
                                description: 'Sender address. Configure an address your SMTP provider permits.',
                            },
                            {
                                name: 'SMTP_USERNAME',
                                type: 'string · optional',
                                description:
                                    'SMTP authentication username. Configure together with SMTP_PASSWORD or omit both.',
                            },
                            {
                                name: 'SMTP_PASSWORD',
                                type: 'string · optional',
                                description: 'SMTP authentication password. Requires SMTP_USERNAME.',
                            },
                            {
                                name: 'GOOGLE_OAUTH_CLIENT_ID',
                                type: 'string · optional',
                                description: 'Enables Google sign-in when configured with GOOGLE_OAUTH_CLIENT_SECRET.',
                            },
                            {
                                name: 'GOOGLE_OAUTH_CLIENT_SECRET',
                                type: 'string · optional',
                                description: 'Google OAuth client secret. Requires GOOGLE_OAUTH_CLIENT_ID.',
                            },
                            {
                                name: 'GITHUB_OAUTH_CLIENT_ID',
                                type: 'string · optional',
                                description: 'Enables GitHub sign-in when configured with GITHUB_OAUTH_CLIENT_SECRET.',
                            },
                            {
                                name: 'GITHUB_OAUTH_CLIENT_SECRET',
                                type: 'string · optional',
                                description: 'GitHub OAuth client secret. Requires GITHUB_OAUTH_CLIENT_ID.',
                            },
                            {
                                name: 'STRIPE_SECRET_KEY',
                                type: 'string · optional',
                                description:
                                    'Stripe secret or restricted API key. Configure with STRIPE_WEBHOOK_SECRET to enable payments.',
                            },
                            {
                                name: 'STRIPE_WEBHOOK_SECRET',
                                type: 'string · optional',
                                description:
                                    'Stripe webhook signing secret beginning with whsec_. Requires STRIPE_SECRET_KEY.',
                            },
                        ]}
                        columns={[
                            {
                                key: 'name',
                                header: 'Environment variables',
                                width: proportional(1),
                                renderCell: (environment) => (
                                    <Stack gap={0}>
                                        <Stack direction="horizontal" align="center" gap={2} wrap="wrap">
                                            <Text>{environment.name}</Text>
                                            <Code className="text-sm">{environment.type}</Code>
                                        </Stack>
                                        <Text type="supporting">{environment.description}</Text>
                                    </Stack>
                                ),
                            },
                        ]}
                    />
                </Stack>
            </Stack>
        </DocumentationArticle>
    );
}
