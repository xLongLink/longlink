import { legalPaths } from '@/platform/legal';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { PublicArticle } from '@/platform/components/Article';

const article = {
    description: 'Read the LongLink legal notice and company information.',
    toc: [
        { id: 'impressum', label: 'Impressum', level: 1 },
        { id: 'company', label: 'Company', level: 2 },
        { id: 'contact', label: 'Contact', level: 2 },
    ],
    lastUpdated: '2026-07-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/legal/Impressum.tsx',
    title: 'Impressum | LongLink',
};

/** Renders the legal notice and company information. */
export default function Impressum() {
    // Keep the legal notice within the shared public shell and legal reading order.
    return (
        <PublicArticle article={article} paths={legalPaths}>
            <ImpressumContent />
        </PublicArticle>
    );
}

/** Renders the legal notice and company information. */
function ImpressumContent() {
    return (
        <Stack
            className="[--font-family-heading:var(--font-family-handwritten)] [&_.astryx-heading]:tracking-wide [&_.astryx-heading]:uppercase"
            gap={5}
        >
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
                    <Link href="mailto:info@longlink.dev" hasUnderline type="inherit">
                        info@longlink.dev
                    </Link>
                </Text>
            </Stack>
        </Stack>
    );
}
