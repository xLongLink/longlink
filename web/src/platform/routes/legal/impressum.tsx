import { legalPaths } from '@/platform/publications';
import { PublicArticle } from '@/components/layouts/article';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeStack as Stack } from '@/components/custom/native-stack';

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
                <h1 className="font-semibold tracking-tight text-4xl" id="impressum">
                    Impressum
                </h1>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="company">
                        Company
                    </h2>
                    <p>LongLink SAGL</p>
                    <p>Company registration number (UID): CHE-150.642.313</p>
                    <p>Legal form: Limited liability company (Sagl)</p>
                </Stack>

                <Stack as="section" gap={3}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="contact">
                        Contact
                    </h2>
                    <p>
                        Email:{' '}
                        <Link href="mailto:info@longlink.dev" className="underline">
                            info@longlink.dev
                        </Link>
                    </p>
                </Stack>
            </Stack>
        </PublicArticle>
    );
}
