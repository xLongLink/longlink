import { Bot, Boxes, Code2, Cog, Puzzle, Table2 } from 'lucide-react';

import { Wordmark } from '@/components/Wordmark';
import { A } from '@/components/ui/a';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const metadata = {
    lastUpdated: '2026-07-09',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/index.tsx',
};

export const content = (
    <Stack>
        <Heading className="flex items-center" id="longlink" level="h1">
            <Wordmark className="text-4xl" />
        </Heading>
        <P>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim
        </P>

        <div className="grid gap-8 rounded-md border bg-muted/10 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
            <Stack className="gap-4">
                <div className="space-y-2">
                    <div
                        className="mx-auto flex min-h-10 items-center justify-center gap-1 rounded-md border bg-muted/40 px-3 py-2 text-center text-sm whitespace-nowrap"
                        style={{ width: '48%' }}
                    >
                        <span className="font-medium text-foreground">Sector -</span>
                        <A
                            className="font-semibold tabular-nums"
                            href="https://unstats.un.org/unsd/classifications/Econ/Download/In%20Text/ISIC_Rev_5_english_structure.csv"
                        >
                            22
                        </A>
                    </div>
                    <div
                        className="mx-auto flex min-h-10 items-center justify-center gap-1 rounded-md border bg-muted/40 px-3 py-2 text-center text-sm whitespace-nowrap"
                        style={{ width: '64%' }}
                    >
                        <span className="font-medium text-foreground">Division -</span>
                        <A
                            className="font-semibold tabular-nums"
                            href="https://unstats.un.org/unsd/classifications/Econ/Download/In%20Text/ISIC_Rev_5_english_structure.csv"
                        >
                            87
                        </A>
                    </div>
                    <div
                        className="mx-auto flex min-h-10 items-center justify-center gap-1 rounded-md border bg-muted/40 px-3 py-2 text-center text-sm whitespace-nowrap"
                        style={{ width: '82%' }}
                    >
                        <span className="font-medium text-foreground">Industry group -</span>
                        <A
                            className="font-semibold tabular-nums"
                            href="https://unstats.un.org/unsd/classifications/Econ/Download/In%20Text/ISIC_Rev_5_english_structure.csv"
                        >
                            258
                        </A>
                    </div>
                    <div
                        className="mx-auto flex min-h-10 items-center justify-center gap-1 rounded-md border bg-muted/40 px-3 py-2 text-center text-sm whitespace-nowrap"
                        style={{ width: '100%' }}
                    >
                        <span className="font-medium text-foreground">Industry classification -</span>
                        <A
                            className="font-semibold tabular-nums"
                            href="https://unstats.un.org/unsd/classifications/Econ/Download/In%20Text/ISIC_Rev_5_english_structure.csv"
                        >
                            463
                        </A>
                    </div>
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
                    <div
                        className="mx-auto flex min-h-10 items-center justify-center gap-1 rounded-md border bg-muted/40 px-3 py-2 text-center text-sm whitespace-nowrap"
                        style={{ width: '48%' }}
                    >
                        <span className="font-medium text-foreground">International</span>
                    </div>
                    <div
                        className="mx-auto flex min-h-10 items-center justify-center gap-1 rounded-md border bg-muted/40 px-3 py-2 text-center text-sm whitespace-nowrap"
                        style={{ width: '64%' }}
                    >
                        <span className="font-medium text-foreground">National -</span>
                        <A
                            className="font-semibold tabular-nums"
                            href="https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes"
                        >
                            249
                        </A>
                    </div>
                    <div
                        className="mx-auto flex min-h-10 items-center justify-center gap-1 rounded-md border bg-muted/40 px-3 py-2 text-center text-sm whitespace-nowrap"
                        style={{ width: '82%' }}
                    >
                        <span className="font-medium text-foreground">Regional -</span>
                        <A className="font-semibold tabular-nums" href="https://en.wikipedia.org/wiki/ISO_3166-2">
                            5,046
                        </A>
                    </div>
                    <div
                        className="mx-auto flex min-h-10 items-center justify-center gap-1 rounded-md border bg-muted/40 px-3 py-2 text-center text-sm whitespace-nowrap"
                        style={{ width: '100%' }}
                    >
                        <span className="font-medium text-foreground">Municipal -</span>
                        <A className="font-semibold tabular-nums" href="https://gadm.org/data.html">
                            400,000+
                        </A>
                    </div>
                </div>
            </Stack>
        </div>

        <P>
            LongLink is open-source and designed to be extended. It provides a shared foundation and guardrails
            for building business-process applications as maintainable code instead of isolated one-off systems,
            handling authentication, organizations, permissions, deployment, databases, storage, routing, logs, status,
            and a consistent application shell while each application remains a normal Python service that owns its
            specific logic, data model, validation, workflow, integrations, APIs, and pages.
        </P>
        <P>
            Python gives business users and developers a shared surface. Business requirements can be expressed as
            readable data models, validation rules, workflows, and screens, while developers keep the application inside
            a standard ecosystem for testing, review, deployment, and long-term maintenance.
        </P>

        <Heading id="why" level="h2">
            Why
        </Heading>

        <P>
            AI has changed the cost structure of software creation. As applications become faster and cheaper to build,
            more workflows, approvals, procurement flows, onboarding processes, compliance cases, operations, and
            structured data processes can be expressed directly in code.
        </P>
        <P>
            Companies already use several setups for this work, but each one breaks down in a different way when the
            process becomes specific, regulated, or long-lived.
        </P>
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="bg-muted/50">Approach</TableHead>
                        <TableHead className="bg-muted/50">Problem</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                    <Table2 aria-hidden={true} className="size-4" />
                                </div>
                                <span className="font-medium text-foreground">Spreadsheets</span>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            The setup is fragile and manual, so the process depends on coordination outside the system
                            and becomes hard to scale or govern.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                    <Cog aria-hidden={true} className="size-4" />
                                </div>
                                <span className="font-medium text-foreground">Generic SaaS</span>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            The setup is too rigid, forcing teams to change the process while business rules move into
                            workarounds and disconnected tools.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                    <Boxes aria-hidden={true} className="size-4" />
                                </div>
                                <span className="font-medium text-foreground">Specialized SaaS</span>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            The setup fits one domain, but vendor-defined workflows still push specific rules into
                            workarounds, exports, and parallel systems.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                    <Puzzle aria-hidden={true} className="size-4" />
                                </div>
                                <span className="font-medium text-foreground">No-Code / Low-Code</span>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            The setup is quick to start, but becomes fragile over time as complexity grows faster than
                            the platform model can absorb.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                    <Bot aria-hidden={true} className="size-4" />
                                </div>
                                <span className="font-medium text-foreground">One-shot / Vibecoded Solutions</span>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            The setup is fast to produce, but often lacks architecture, tests, permissions, deployment
                            discipline, and a clear path for maintenance.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                    <Code2 aria-hidden={true} className="size-4" />
                                </div>
                                <span className="font-medium text-foreground">Custom Build</span>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            The setup solves fit, but it is expensive and slow because every application rebuilds the
                            same operational foundation.
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

        <P>
            LongLink exists for the large set of processes that are too specific for off-the-shelf tools but too common
            to justify starting from an empty stack. It lets teams build each process as a deployable Python application
            while the platform owns identity, access, infrastructure, routing, deployment, storage, logs, and status.
        </P>
        <P>
            Process software also needs explicit structure. Industries, geographies, roles, workflow states, validation
            rules, and operational actions should be represented in code and governed by the platform, not scattered
            across dashboards, spreadsheets, and private conventions.
        </P>
        <P>
            This makes applications faster to build, easier to understand, and cheaper to maintain. It also gives teams
            better visibility and control, because applications run inside one coordinated platform instead of being
            scattered across separate tools and one-off systems.
        </P>
        <P>
            The result is a shared operating layer for reusable business-process applications: normal code where the
            process is specific, platform-managed infrastructure where every application would otherwise repeat itself.
        </P>
    </Stack>
);
