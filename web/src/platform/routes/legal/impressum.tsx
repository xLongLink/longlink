import { legalPaths } from '@/platform/publications';
import { PublicArticle } from '@/components/layouts/article';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

const article = {
    description: 'Read the LongLink legal notice and company information.',
    toc: [
        { id: 'impressum', label: 'Impressum', level: 1 },
        { id: 'company', label: 'Company', level: 2 },
        { id: 'contact', label: 'Contact', level: 2 }
    ],
    lastUpdated: '2026-07-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/legal/impressum.tsx',
    title: 'Impressum | LongLink'
};

/** Renders the legal notice and company information. */
export default function Impressum() {
    // Keep the legal notice within the shared public shell and legal reading order.
    return (
        <PublicArticle article={article} paths={legalPaths}>
            <Stack className="[&_:is(h1,h2,h3,h4,h5,h6)]:tracking-wide" gap={5}>
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
                        <Link href="mailto:info@longlink.dev" hasUnderline>
                            info@longlink.dev
                        </Link>
                    </Text>
                </Stack>
            </Stack>
        </PublicArticle>
    );
}
