import { createElement } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import type { ArticlePage } from '@/lib/articles';
import { Legal } from '@/platform/layouts/Legal';
import { publicSeoMeta } from '@/lib/seo';
import { Article } from '@/components/layouts/Article';

export const metadata = {
    path: '/impressum',
    title: 'Impressum',
    description: 'Read the LongLink legal notice and company information.',
    toc: [
        { id: 'impressum', label: 'Impressum', level: 1 },
        { id: 'company', label: 'Company', level: 2 },
        { id: 'contact', label: 'Contact', level: 2 },
    ],
    lastUpdated: '2026-07-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/legal/Impressum.tsx',
};

const page: ArticlePage = {
    ...metadata,
    content: createElement(ImpressumContent),
    metadata,
};

/** Returns SEO metadata for the impressum article. */
export const meta = () => publicSeoMeta(metadata);

/** Renders the legal notice and company information. */
export default function Impressum() {
    return (
        <Legal>
            <Article page={page} />
        </Legal>
    );
}

/** Renders the legal notice and company information. */
function ImpressumContent() {
    return (
        <Stack gap={5}>
            <Heading id="impressum" level={1}>
                Impressum
            </Heading>

            <Stack as="section" gap={3}>
                <Heading id="company" level={2}>
                    Company
                </Heading>
                <Text as="p">LongLink SAGL</Text>
                <Text as="p">Company registration number (UID): CHE-150.642.313</Text>
                <Text as="p">Legal form: Limited liability company (Sagl)</Text>
            </Stack>

            <Stack as="section" gap={3}>
                <Heading id="contact" level={2}>
                    Contact
                </Heading>
                <Text as="p">
                    Email:{' '}
                    <Link href="mailto:info@longlink.ch" hasUnderline type="inherit">
                        info@longlink.ch
                    </Link>
                </Text>
            </Stack>
        </Stack>
    );
}
