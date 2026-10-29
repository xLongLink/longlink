import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { DocumentationArticle } from '@/components/layouts/Article';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

const article = {
    title: 'LongLink vs Windmill | LongLink Documentation',
    description: 'Compare LongLink and Windmill for Python business applications, internal tools, and automation.',
    toc: [
        { id: 'longlink-vs-windmill', label: 'LongLink vs Windmill', level: 1 },
        { id: 'at-a-glance', label: 'At a glance', level: 2 },
        { id: 'application-first-or-execution-first', label: 'Different starting points', level: 2 },
        { id: 'choosing-a-platform', label: 'Choosing a platform', level: 2 },
        { id: 'sources', label: 'Sources', level: 2 },
    ],
    lastUpdated: '2026-10-29',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/alternatives/Windmill.tsx',
};

const comparison = [
    {
        area: 'Primary building block',
        longlink: 'A Solution: a Python application with API routes, data models, and user-facing Views.',
        windmill: 'Scripts, flows, and apps backed by a job execution engine and workers.',
    },
    {
        area: 'Backend development',
        longlink: 'Python-first, using FastAPI, Pydantic, SQLModel, and other Python packages.',
        windmill: 'Multiple languages, including Python, TypeScript, SQL, Go, and Bash.',
    },
    {
        area: 'User interfaces',
        longlink: 'JSX Views with built-in components and hooks; no separate frontend build is needed for a Solution.',
        windmill: 'Full-code React or Svelte apps connected to backend runnables; a legacy low-code editor also exists.',
    },
    {
        area: 'Processes and automation',
        longlink: 'Implement business rules, state transitions, and workflows in application code.',
        windmill: 'Compose scripts into visual flows or workflows as code, with branching, retries, approvals, and triggers.',
    },
    {
        area: 'Persistent data',
        longlink: 'SQLModel models with a Solution-scoped database schema and a file-storage interface.',
        windmill: 'Data Tables and connections to external data sources, accessed from scripts, flows, or apps.',
    },
    {
        area: 'Deployment',
        longlink: 'Run Solutions as containerized services, with organization access and infrastructure managed by the Platform.',
        windmill: 'Run on Windmill Cloud or self-host its server and worker infrastructure.',
    },
    {
        area: 'AI integration',
        longlink: 'Expose Solution functionality to AI agents through the Platform MCP server.',
        windmill: 'Expose scripts and flows to LLM clients through Windmill MCP.',
    },
];

/** Explains the overlap and architectural differences between LongLink and Windmill. */
export default function Windmill() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="longlink-vs-windmill" level={1}>
                    LongLink vs Windmill
                </Heading>
                <Text as="p">
                    LongLink and{' '}
                    <Link href="https://www.windmill.dev/" hasUnderline isExternalLink type="inherit">
                        Windmill
                    </Link>{' '}
                    both help teams build internal tools and automate work. They approach the problem from different
                    directions: LongLink starts with a Python business application, while Windmill starts with a
                    multi-language execution and workflow platform.
                </Text>
                <Text as="p">
                    Neither is limited to one type of interface. LongLink Solutions include user-facing Views;
                    Windmill supports full-code React and Svelte apps alongside scripts and workflows. The more useful
                    distinction is how you develop, structure, and operate the underlying software.
                </Text>

                <Heading id="at-a-glance" level={2}>
                    At a glance
                </Heading>
                <Stack className="overflow-x-auto">
                    <Table density="compact" verticalAlign="top" className="min-w-160">
                        <TableHeader>
                            <TableRow>
                                <TableHeaderCell>Aspect</TableHeaderCell>
                                <TableHeaderCell>LongLink</TableHeaderCell>
                                <TableHeaderCell>Windmill</TableHeaderCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {comparison.map(({ area, longlink, windmill }) => (
                                <TableRow key={area}>
                                    <TableCell>
                                        <Text weight="semibold">{area}</Text>
                                    </TableCell>
                                    <TableCell>
                                        <Text>{longlink}</Text>
                                    </TableCell>
                                    <TableCell>
                                        <Text>{windmill}</Text>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Stack>

                <Heading id="application-first-or-execution-first" level={2}>
                    Different starting points
                </Heading>
                <Text as="p">
                    In LongLink, a Solution is structured like a conventional Python service. You define HTTP routes
                    with FastAPI, data with SQLModel, and validation with Pydantic. You can add JSX Views within the
                    same Solution, and the Platform provides authentication, deployment, database access, and storage.
                    This approach is suited to ongoing business applications that maintain their own domain models
                    and expose a dedicated interface.
                </Text>
                <Text as="p">
                    In Windmill, scripts are executable units that can be called individually or orchestrated into
                    flows. Windmill supplies scheduling, event triggers, retries, and an execution queue. Its
                    full-code apps can call those scripts and flows from React or Svelte, so you can also build
                    complete internal applications. This approach is well suited to automation involving many
                    services, scheduled jobs, and multi-step execution.
                </Text>

                <Heading id="choosing-a-platform" level={2}>
                    Choosing a platform
                </Heading>
                <Text as="p">
                    Consider <Text as="span" weight="semibold">LongLink</Text> when the main deliverable is a
                    persistent, Python-based business application with its own data model, API, and interface.
                    Familiar FastAPI and SQLModel patterns make the application code the primary source of truth.
                </Text>
                <Text as="p">
                    Consider <Text as="span" weight="semibold">Windmill</Text> when the main deliverable is a set of
                    scripts, scheduled tasks, integrations, or orchestrated workflows. It is also a strong option
                    when you want multi-language backend runnables and a custom React or Svelte frontend.
                </Text>
                <Text as="p">
                    The products overlap substantially. Choose based on the code structure and execution model you
                    want to maintain, rather than assuming one can build interfaces and the other cannot.
                </Text>

                <Heading id="sources" level={2}>
                    Sources
                </Heading>
                <Text as="p">
                    For LongLink, see the{' '}
                    <Link href="/docs/sdk/" hasUnderline type="inherit">
                        Solution SDK
                    </Link>
                    ,{' '}
                    <Link href="/docs/sdk/views/" hasUnderline type="inherit">
                        Views
                    </Link>
                    ,{' '}
                    <Link href="/docs/sdk/database/" hasUnderline type="inherit">
                        Database
                    </Link>
                    , and{' '}
                    <Link href="/docs/api/" hasUnderline type="inherit">
                        Platform
                    </Link>{' '}
                    documentation. For Windmill, see the official{' '}
                    <Link href="https://www.windmill.dev/docs/intro" hasUnderline isExternalLink type="inherit">
                        introduction
                    </Link>
                    ,{' '}
                    <Link
                        href="https://www.windmill.dev/docs/getting_started/full_code_apps_quickstart"
                        hasUnderline
                        isExternalLink
                        type="inherit"
                    >
                        full-code apps guide
                    </Link>
                    , and{' '}
                    <Link href="https://www.windmill.dev/docs/getting_started/triggers/" hasUnderline isExternalLink type="inherit">
                        triggers guide
                    </Link>
                    .
                </Text>
                <Text type="supporting">
                    This comparison describes documented capabilities as of October 2026. Features, hosted plans, and
                    editions may change; LongLink is also under active development.
                </Text>
            </Stack>
        </DocumentationArticle>
    );
}
