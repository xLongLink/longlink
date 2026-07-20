import { Bot, Boxes, Code2, Cog, Puzzle, Table2 } from 'lucide-react';
import { A } from '@/components/ui/a';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Wordmark } from '@/components/Wordmark';
import { Heading } from '@/components/ui/heading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const metadata = {
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/index.tsx',
};

export const content = (
    <Stack>
        <Heading id="introduction" level="h1">
            Introduction
        </Heading>
        <P>
            Across industries and geographies, there are hundreds of millions of distinct operational contexts. Each has
            its own regulations, roles, data requirements, approval paths, integrations, terminology, and exceptions.
            Even similar businesses rarely operate in exactly the same way, creating a vast number of processes that may
            require dedicated software.
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
                            href="https://unstats.un.org/unsd/publication/seriesm/seriesm_4rev4e.pdf"
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
                            href="https://unstats.un.org/unsd/publication/seriesm/seriesm_4rev4e.pdf"
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
                            href="https://unstats.un.org/unsd/publication/seriesm/seriesm_4rev4e.pdf"
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
                            href="https://unstats.un.org/unsd/publication/seriesm/seriesm_4rev4e.pdf"
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
            Today, companies manage these processes through combinations of different SaaS products, spreadsheets,
            forms, dashboards, email, enterprise platforms, and custom software, resulting in a fragmented and often
            poorly documented ecosystem.
        </P>
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="bg-muted/50">Approach</TableHead>
                        <TableHead className="bg-muted/50"></TableHead>
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
                            What happens when the person leaves?
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
                            Just write to the support, not even AI understand the documentation.
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
                            Wait untill you see the invoice.
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
                            Not sure, an intern has set this up a few years ago.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                    <Bot aria-hidden={true} className="size-4" />
                                </div>
                                <span className="font-medium text-foreground">Vibecoded Solutions</span>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            Move the button on the top right. Wait ... where did the database go?
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
                            Yes we know, someone has opened a Jira ticket a few years ago.
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

        <P>
            AI has changed the economics of software creation. Applications can now be built faster, at a lower cost,
            and with less engineering effort. This makes it practical to turn a much larger number of specific business
            processes into dedicated software.
        </P>
        <P>
            However, faster development does not automatically produce reliable or maintainable systems. Every
            application still requires a common foundation: authentication, organizations, permissions, databases,
            storage, deployment, routing, logs, monitoring, and a consistent operating environment. Rebuilding this
            layer for every application creates costs that are ultimately reflected in the final price.
        </P>
        <P>
            LongLink provides this foundation, allowing teams to build and operate business-process applications as
            normal software. It manages the infrastructure common to every application, while each application owns its
            specific data model, rules, workflows, integrations, interfaces, and business logic.
        </P>
        <P>
            This approach brings the way businesses define their operations closer to software-engineering practices.
            Processes become explicit models, states, rules, actions, and interfaces, creating systems that are more
            modular, structured, and less prone to error, as well as easier to test, review, audit, document, extend,
            and maintain.
        </P>
        <P>
            Python is central to this model. It provides a practical bridge between business knowledge, professional
            software development, and AI-assisted creation. Its syntax keeps process logic understandable, while its
            ecosystem supports the validation, data modelling, APIs, databases, testing, and engineering practices
            required for production software. LongLink is built with widely used Python libraries whose deep
            representation in AI training data and development workflows improves the quality and precision of
            AI-assisted development.
        </P>
        <P>
            And, of course, is <A href="https://github.com/xLongLink/longlink">open source</A>.
        </P>
    </Stack>
);
