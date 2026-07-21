import type { IconName } from '@astryxdesign/core/Icon';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

const industryLevels = [
    {
        label: 'Sector',
        value: '22',
        href: 'https://unstats.un.org/unsd/publication/seriesm/seriesm_4rev4e.pdf',
    },
    {
        label: 'Division',
        value: '87',
        href: 'https://unstats.un.org/unsd/publication/seriesm/seriesm_4rev4e.pdf',
    },
    {
        label: 'Industry group',
        value: '258',
        href: 'https://unstats.un.org/unsd/publication/seriesm/seriesm_4rev4e.pdf',
    },
    {
        label: 'Industry classification',
        value: '463',
        href: 'https://unstats.un.org/unsd/publication/seriesm/seriesm_4rev4e.pdf',
    },
];

const geographyLevels = [
    { label: 'International', value: null, href: null },
    {
        label: 'National',
        value: '249',
        href: 'https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes',
    },
    { label: 'Regional', value: '5,046', href: 'https://en.wikipedia.org/wiki/ISO_3166-2' },
    { label: 'Municipal', value: '400,000+', href: 'https://gadm.org/data.html' },
];

const approaches: { description: string; icon: IconName; name: string }[] = [
    { name: 'Spreadsheets', description: 'What happens when the person leaves?', icon: 'viewColumns' },
    {
        name: 'Generic SaaS',
        description: 'Just write to the support, not even AI understand the documentation.',
        icon: 'wrench',
    },
    { name: 'Specialized SaaS', description: 'Wait untill you see the invoice.', icon: 'copy' },
    {
        name: 'No-Code / Low-Code',
        description: 'Not sure, an intern has set this up a few years ago.',
        icon: 'moreHorizontal',
    },
    {
        name: 'Vibecoded Solutions',
        description: 'Move the button on the top right. Wait ... where did the database go?',
        icon: 'warning',
    },
    {
        name: 'Custom Build',
        description: 'Yes we know, someone has opened a Jira ticket a few years ago.',
        icon: 'wrench',
    },
];

/** Renders one side of the industry and geography context comparison. */
function ContextLevels({ items }: { items: typeof industryLevels | typeof geographyLevels }) {
    return (
        <Stack gap={2}>
            {items.map((item) => (
                <Card key={item.label} padding={2} variant="muted">
                    <Stack direction="horizontal" gap={1} justify="center" align="center">
                        <Text weight="semibold">{item.label}</Text>
                        {item.value && item.href ? (
                            <>
                                <Text>-</Text>
                                <Link href={item.href} isExternalLink type="inherit" weight="semibold">
                                    {item.value}
                                </Link>
                            </>
                        ) : null}
                    </Stack>
                </Card>
            ))}
        </Stack>
    );
}

export const metadata = {
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/index.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="introduction" level={1}>
            Introduction
        </Heading>
        <Text as="p">
            Across industries and geographies, there are hundreds of millions of distinct operational contexts. Each has
            its own regulations, roles, data requirements, approval paths, integrations, terminology, and exceptions.
            Even similar businesses rarely operate in exactly the same way, creating a vast number of processes that may
            require dedicated software.
        </Text>
        <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4} align="center">
            <ContextLevels items={industryLevels} />
            <Stack gap={1} align="center">
                <Text type="display-3" hasTabularNumbers>
                    336'000'000+
                </Text>
                <Text type="supporting" weight="semibold" justify="center">
                    Industry × Geography Contexts
                </Text>
            </Stack>
            <ContextLevels items={geographyLevels} />
        </Grid>
        <Text as="p">
            Today, companies manage these processes through combinations of different SaaS products, spreadsheets,
            forms, dashboards, email, enterprise platforms, and custom software, resulting in a fragmented and often
            poorly documented ecosystem.
        </Text>
        <Table<Record<string, unknown>>>
            <TableHeader>
                <TableRow>
                    <TableHeaderCell>Approach</TableHeaderCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {approaches.map((approach) => (
                    <TableRow key={approach.name}>
                        <TableCell>
                            <Stack gap={1}>
                                <Stack direction="horizontal" gap={2} align="center">
                                    <Icon icon={approach.icon} size="sm" color="accent" />
                                    <Text weight="semibold">{approach.name}</Text>
                                </Stack>
                                <Text type="supporting">{approach.description}</Text>
                            </Stack>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        <Text as="p">
            AI has changed the economics of software creation. Applications can now be built faster, at a lower cost,
            and with less engineering effort. This makes it practical to turn a much larger number of specific business
            processes into dedicated software.
        </Text>
        <Text as="p">
            However, faster development does not automatically produce reliable or maintainable systems. Every
            application still requires a common foundation: authentication, organizations, permissions, databases,
            storage, deployment, routing, logs, monitoring, and a consistent operating environment. Rebuilding this
            layer for every application creates costs that are ultimately reflected in the final price.
        </Text>
        <Text as="p">
            LongLink provides this foundation, allowing teams to build and operate business-process applications as
            normal software. It manages the infrastructure common to every application, while each application owns its
            specific data model, rules, workflows, integrations, interfaces, and business logic.
        </Text>
        <Text as="p">
            This approach brings the way businesses define their operations closer to software-engineering practices.
            Processes become explicit models, states, rules, actions, and interfaces, creating systems that are more
            modular, structured, and less prone to error, as well as easier to test, review, audit, document, extend,
            and maintain.
        </Text>
        <Text as="p">
            Python is central to this model. It provides a practical bridge between business knowledge, professional
            software development, and AI-assisted creation. Its syntax keeps process logic understandable, while its
            ecosystem supports the validation, data modelling, APIs, databases, testing, and engineering practices
            required for production software. LongLink is built with widely used Python libraries whose deep
            representation in AI training data and development workflows improves the quality and precision of
            AI-assisted development.
        </Text>
        <Text as="p">
            And, of course, is{' '}
            <Link href="https://github.com/xLongLink/longlink" isExternalLink type="inherit">
                open source
            </Link>
            .
        </Text>
    </Stack>
);
