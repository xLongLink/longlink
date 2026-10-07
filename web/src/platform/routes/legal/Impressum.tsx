import { legalPaths } from '@/platform/legal';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { Seo, articleRouteLabels } from '@/components/Seo';
import { PathBreadcrumb } from '@/components/breadcrumb/Path';
import { BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { ArticleFooter, ArticleOutline } from '@/platform/components/Article';

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
    return (
        <>
            <Seo description={article.description} hasBreadcrumbs title={article.title} />
            <Article
                header={
                    <PathBreadcrumb
                        className="min-w-0 overflow-hidden"
                        labels={articleRouteLabels}
                        root={<BreadcrumbItem href="/">Home</BreadcrumbItem>}
                    />
                }
                headerAction={<Button href="/login/" label="Get Started" size="sm" variant="primary" />}
                footer={
                    <ArticleFooter lastUpdated={article.lastUpdated} editUrl={article.editUrl} paths={legalPaths} />
                }
                sidebar={article.toc.length ? <ArticleOutline items={article.toc} /> : undefined}
            >
                <ImpressumContent />
            </Article>
        </>
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
