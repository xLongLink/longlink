import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';

const metadata = {
    seo: {
        title: 'Documentation | LongLink',
        description: 'Learn how to build, deploy, and operate business software with LongLink.',
    },
    toc: [{ id: 'introduction', label: 'Introduction', level: 1 }],
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/Index.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Heading id="introduction" level={1}>
                    Introduction
                </Heading>
                <Text as="p">
                    Across industries and geographies, businesses operate within distinct regulatory, organizational,
                    and technical contexts. Their processes differ in roles, data requirements, approval paths,
                    integrations, terminology, and exceptions. As a result, even similar organizations often need
                    software that reflects how they actually operate.
                </Text>
                <Text as="p">
                    Most companies manage these needs through a growing mix of SaaS products, spreadsheets, forms,
                    dashboards, email, enterprise systems, scripts, and AI-generated tools. Business logic becomes
                    distributed across these systems, making processes harder to understand, govern, and maintain. Over
                    time, this fragmentation increases operational complexity and technical debt.
                </Text>
                <Text as="p">
                    AI has lowered development costs. When a process is well defined and its context is available, teams
                    can now create tailored business software more quickly. However, many existing platforms require it
                    to run within proprietary environments, data models, and deployment systems. This can limit
                    portability, increase dependence on a vendor, and reduce the long-term value of customization.
                </Text>
                <Text as="p">
                    LongLink is an open-source foundation for building, deploying, and operating dedicated systems with
                    standard Python tools. The Platform provides common infrastructure, while each organization retains
                    control of its source code, data, workflows, and integrations. This enables teams to adapt their
                    systems as requirements evolve without committing them to a proprietary runtime.
                </Text>
                <Text as="p">
                    As AI accelerates development, quality becomes more important, not less. LongLink combines
                    AI-assisted development with a consistent Platform foundation so teams can keep what they build
                    clear, reliable, adaptable, and maintainable over time.
                </Text>
            </Stack>
        </Article>
    );
}
