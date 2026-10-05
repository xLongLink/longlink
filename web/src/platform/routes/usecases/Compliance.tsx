import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { Blockquote } from '@astryxdesign/core/Blockquote';

const article = {
    description: 'Build processes for checks, evidence, findings, and corrective actions around your requirements.',
    toc: [{ id: 'compliance-and-quality', label: 'Compliance & quality', level: 1 }],
    lastUpdated: '2026-10-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/usecases/Compliance.tsx',
    title: 'Compliance & quality | LongLink Use Cases',
};

/** Explains how Solutions can support compliance and quality processes. */
export default function Compliance() {
    // Reuse the existing article shell: 260px navigation, 720px prose, and 224px outline.
    return (
        <Article page={article}>
            <Stack gap={4}>
                <Heading id="compliance-and-quality" level={1} textWrap="balance">
                    Compliance & quality
                </Heading>
                <Blockquote className="border-s-(--color-text-orange) text-(--color-text-orange)">
                    <Stack gap={0}>
                        <Text type="inherit">Beta notice: This page is being built.</Text>
                        <Link color="inherit" href={article.editUrl} hasUnderline isExternalLink type="inherit">
                            Edit on GitHub
                        </Link>
                    </Stack>
                </Blockquote>
                <Text as="p" textWrap="pretty">
                    Compliance and quality depend on knowing what should happen, who is responsible, and what evidence
                    remains when the work is complete. When this information is separated across documents,
                    spreadsheets, and systems, maintaining a clear picture becomes difficult.
                </Text>
                <Text as="p" textWrap="pretty">
                    Dedicated software can connect requirements, actions, evidence, reviews, and corrective work in one
                    process.
                </Text>
                <Text as="p" textWrap="pretty">
                    These controls become explicit Solutions that remain understandable and maintainable over time.
                </Text>
                <Card className="handwritten-diagram relative overflow-hidden" padding={0} variant="transparent">
                    <img
                        alt="A compliance shield connects requirements, evidence, reviews, and quality improvements."
                        className="aspect-video w-full scale-90 object-contain"
                        decoding="async"
                        height={1086}
                        loading="lazy"
                        src="/images/compliance-and-quality.png"
                        width={1448}
                    />
                </Card>
            </Stack>
        </Article>
    );
}
