import { Code2, Cog, Puzzle, Table2 } from 'lucide-react';

import { A } from '@/components/ui/a';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const currentSoftwareApproaches = [
    {
        name: 'Spreadsheets',
        problem: 'Fragile, manual, hard to scale, no governance.',
        impact: 'The process depends on coordination outside the system.',
        icon: Table2,
    },
    {
        name: 'Generic SaaS',
        problem: 'Too rigid and forces teams to change their process.',
        impact: 'Business rules move into workarounds and disconnected tools.',
        icon: Cog,
    },
    {
        name: 'No-Code / Low-Code',
        problem: 'Quick to start, fragile over time, hard to govern.',
        impact: 'Complexity grows faster than the platform model can absorb.',
        icon: Puzzle,
    },
    {
        name: 'Custom Build',
        problem: 'Expensive, slow, duplicated infrastructure.',
        impact: 'Every application rebuilds the same operational foundation.',
        icon: Code2,
    },
] as const;

const isicSourceHref =
    'https://unstats.un.org/unsd/classifications/Econ/Download/In%20Text/ISIC_Rev_5_english_structure.csv';

const isicLevels = [
    {
        name: 'Sector',
        count: '22',
        href: isicSourceHref,
        width: '48%',
    },
    {
        name: 'Division',
        count: '87',
        href: isicSourceHref,
        width: '64%',
    },
    {
        name: 'Industry group',
        count: '258',
        href: isicSourceHref,
        width: '82%',
    },
    {
        name: 'Industry classification',
        count: '463',
        href: isicSourceHref,
        width: '100%',
    },
] as const;

const geographicLevels = [
    {
        name: 'International',
        count: null,
        href: null,
        width: '48%',
    },
    {
        name: 'National',
        count: '249',
        href: 'https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes',
        width: '64%',
    },
    {
        name: 'Regional',
        count: '5,046',
        href: 'https://en.wikipedia.org/wiki/ISO_3166-2',
        width: '82%',
    },
    {
        name: 'Municipal',
        count: '400,000+',
        href: 'https://gadm.org/data.html',
        width: '100%',
    },
] as const;

export const metadata = {
    lastUpdated: '2026-07-09',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/index.tsx',
};

export const content = (
    <Stack>
        <Heading id="longlink" level="h1">
            LongLink
        </Heading>
        <P>LongLink is an open-source platform for building and running dedicated business-process applications.</P>
        <P>
            AI has changed the cost structure of software creation. As applications become faster and cheaper to build,
            more workflows, approvals, procurement flows, onboarding processes, compliance cases, operations, and
            structured data processes can be expressed directly in code.
        </P>
        <P>
            Speed is not enough on its own. Without a shared foundation, this new wave of application creation produces
            duplicated infrastructure, inconsistent systems, unclear ownership, and long-term maintenance cost. LongLink
            provides that foundation once.
        </P>
        <P>
            The platform handles authentication, organizations, permissions, deployment, databases, storage, routing,
            logs, status, and a consistent application shell. Each application remains a normal Python service that owns
            its specific logic, data model, validation, workflow, integrations, APIs, and pages.
        </P>
        <P>
            The product model is closest to GitHub for business applications and workflows. GitHub made repositories the
            standard unit for managing code; LongLink makes deployable business applications the standard unit for
            running process software.
        </P>
        <P>
            LongLink sits between rigid generic SaaS and expensive fully custom systems: more flexible than closed
            business platforms, faster and more governed than rebuilding the same platform infrastructure for every
            application.
        </P>
        <Heading id="why" level="h2">
            Why
        </Heading>
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="bg-muted/50">Approach</TableHead>
                        <TableHead className="bg-muted/50">Problem</TableHead>
                        <TableHead className="bg-muted/50">Impact</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentSoftwareApproaches.map((approach) => (
                        <TableRow key={approach.name}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                        <approach.icon aria-hidden={true} className="size-4" />
                                    </div>
                                    <span className="font-medium text-foreground">{approach.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="whitespace-normal text-muted-foreground">
                                {approach.problem}
                            </TableCell>
                            <TableCell className="whitespace-normal text-muted-foreground">{approach.impact}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
        <P>
            Companies constantly need software for processes that follow recognizable patterns but differ in their
            rules, roles, data, approvals, integrations, exceptions, and compliance requirements. Generic SaaS is often
            too rigid, spreadsheets and manual coordination become fragile, and fully custom systems repeatedly rebuild
            the same foundation.
        </P>
        <P>
            LongLink exists for the large set of processes that are too specific for generic tools but too common to
            justify starting from an empty stack. It lets teams build each process as a deployable Python application
            while the platform owns identity, access, infrastructure, routing, deployment, storage, logs, and status.
        </P>
        <P>
            Process software also needs explicit structure. Industries, geographies, roles, workflow states, validation
            rules, and operational actions should be represented in code and governed by the platform, not scattered
            across dashboards, spreadsheets, and private conventions.
        </P>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
            <Stack className="gap-4">
                <div className="space-y-2">
                    {isicLevels.map((item) => (
                        <div
                            key={item.name}
                            className="mx-auto flex min-h-10 items-center justify-center gap-1 rounded-md border bg-muted/40 px-3 py-2 text-center text-sm whitespace-nowrap"
                            style={{ width: item.width }}
                        >
                            <span className="font-medium text-foreground">{item.name} -</span>
                            <A className="font-semibold tabular-nums" href={item.href}>
                                {item.count}
                            </A>
                        </div>
                    ))}
                </div>
            </Stack>
            <div className="flex items-center justify-center text-center">
                <div>
                    <div className="text-3xl font-semibold tabular-nums text-foreground">336'000'000+</div>
                    <div className="mt-1 text-sm font-medium text-muted-foreground">Industry × Geography Contexts</div>
                </div>
            </div>
            <Stack className="gap-4">
                <div className="space-y-2">
                    {geographicLevels.map((item) => (
                        <div
                            key={item.name}
                            className="mx-auto flex min-h-10 items-center justify-center gap-1 rounded-md border bg-muted/40 px-3 py-2 text-center text-sm whitespace-nowrap"
                            style={{ width: item.width }}
                        >
                            <span className="font-medium text-foreground">
                                {item.name}
                                {item.count ? ' -' : ''}
                            </span>
                            {item.count ? (
                                <A className="font-semibold tabular-nums" href={item.href}>
                                    {item.count}
                                </A>
                            ) : null}
                        </div>
                    ))}
                </div>
            </Stack>
        </div>
        <P>
            This makes applications faster to build, easier to understand, and cheaper to maintain. It also gives teams
            better visibility and control, because applications run inside one coordinated platform instead of being
            scattered across separate tools and one-off systems.
        </P>
        <P>
            The Python stack strengthens that model in the AI era. Python and its major web, data, API, validation,
            testing, and database libraries are well represented in developer workflows and AI-assisted coding systems,
            which makes applications easier to generate, review, test, extend, and maintain.
        </P>
        <P>
            The result is a shared operating layer for reusable business-process applications: normal code where the
            process is specific, platform-managed infrastructure where every application would otherwise repeat itself.
        </P>
    </Stack>
);
