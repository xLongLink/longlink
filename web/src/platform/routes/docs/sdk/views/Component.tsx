import { useParams } from 'react-router';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import NotFoundLayout from '@/components/layouts/NotFound';
import { documentationLastUpdated } from '@/lib/generated/documentation';
import componentDocumentation from '../../../../../../../sdk/longlink/.static/jsx/components.json';

/** Documents native JSX props using the same declarations supplied to Python Solution editors. */
export default function DocsArticleRoute() {
    const { component: slug } = useParams();
    const component = componentDocumentation.find((candidate) => candidate.slug === slug);

    if (!component) {
        return <NotFoundLayout />;
    }

    const article = {
        description: `Native JSX props for ${component.name}.`,
        lastUpdated: documentationLastUpdated,
        toc: [
            { id: 'introduction', label: 'Introduction', level: 1 },
            { id: 'props', label: 'Props', level: 2 },
            { id: 'cli', label: 'Cli', level: 2 },
        ],
        editUrl: 'https://github.com/xLongLink/longlink/edit/main/sdk/longlink/.static/jsx/frontend.d.ts',
        title: `${component.name} | LongLink Documentation`,
    };

    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="introduction" level={1}>
                    {component.name}
                </Heading>
                <Text as="p">
                    {component.category === 'Runtime'
                        ? `${component.name} is supplied by the isolated LongLink renderer.`
                        : `${component.name} accepts native JSX props in LongLink Views.`}{' '}
                    Values are JavaScript expressions, and writable controls use explicit callbacks. Package imports are
                    not required.
                </Text>
                <Heading id="props" level={2}>
                    Props
                </Heading>
                <CodeBlock
                    code={component.declaration}
                    language="typescript"
                    title="frontend.d.ts"
                    hasLanguageLabel={false}
                />
                <Text as="p">
                    These declarations provide editor hints; you do not need to write TypeScript. See the generated
                    invoice Views for complete JSX examples.
                </Text>
                <Heading id="cli" level={2}>
                    Cli
                </Heading>
                <CodeBlock
                    code={`longlink docs ui --component ${component.name}`}
                    language="bash"
                    hasLanguageLabel={false}
                    isWrapped
                />
            </Stack>
        </Article>
    );
}
