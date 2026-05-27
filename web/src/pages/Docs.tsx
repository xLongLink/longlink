import { Blocks, BookOpen, Database, FlaskConical, FileCode2, Globe, HardDrive, LayoutTemplate, Rocket, ServerCog, ShieldCheck, Waypoints } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import ReactMarkdown, { type Components } from 'react-markdown';
import matter from 'gray-matter';

import { A } from '@/components/ui/a';
import {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
    Breadcrumb as UIBreadcrumb,
} from '@/components/ui/breadcrumb';
import { buttonVariants } from '@/components/ui/button';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarSeparator,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { Wordmark } from '@/components/Wordmark';
import { CodeBlock } from '@/components/CodeBlock';
import { XmlWindow } from '@/components/XmlWindow';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { Ol } from '@/components/ui/ol';
import { P } from '@/components/ui/p';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ul } from '@/components/ui/ul';
import { apiUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

type DocsPageProps = {
    content: string;
};

type MarkdownDocMetadata = {
    lastUpdated: string;
    editUrl: string;
};

type ParsedMarkdownDoc = {
    metadata: MarkdownDocMetadata;
    content: string;
};

type DocItem = {
    title: string;
    path: string;
    id: string;
    icon: typeof BookOpen;
};

type DocGroup = {
    title: string;
    items: DocItem[];
};

type PageTocItem = {
    href: string;
    label: string;
};

type MarkdownBlock =
    | {
          kind: 'markdown';
          content: string;
      }
    | {
          kind: 'tabs';
          tabs: MarkdownTab[];
      };

type MarkdownTab = {
    label: string;
    content: string;
};

type MarkdownCodeProps = {
    children?: ReactNode;
    className?: string;
    inline?: boolean;
};

const DOC_GROUPS: DocGroup[] = [
    {
        title: 'Overview',
        items: [
            {
                title: 'Introduction',
                path: '/docs',
                id: 'introduction',
                icon: BookOpen,
            },
        ],
    },
    {
        title: 'Control Plane',
        items: [
            {
                title: 'Overview',
                path: '/docs/api',
                id: 'control-plane-overview',
                icon: ShieldCheck,
            },
            {
                title: 'Self Hosted',
                path: '/docs/api/self-hosted',
                id: 'self-hosted',
                icon: ServerCog,
            },
        ],
    },
    {
        title: 'Applications SDK',
        items: [
            {
                title: 'Overview',
                path: '/docs/sdk',
                id: 'sdk-overview',
                icon: Blocks,
            },
            {
                title: 'Environments',
                path: '/docs/sdk/environments',
                id: 'environments',
                icon: Globe,
            },
            {
                title: 'Routes',
                path: '/docs/sdk/routes',
                id: 'routes',
                icon: Waypoints,
            },
            {
                title: 'Storage',
                path: '/docs/sdk/storage',
                id: 'storage',
                icon: HardDrive,
            },
            {
                title: 'Database',
                path: '/docs/sdk/database',
                id: 'database',
                icon: Database,
            },
            {
                title: 'Testing',
                path: '/docs/sdk/testing',
                id: 'testing',
                icon: FlaskConical,
            },
            {
                title: 'Build & Publish',
                path: '/docs/sdk/building',
                id: 'building',
                icon: Rocket,
            },
        ],
    },
    {
        title: 'XML Pages',
        items: [
            {
                title: 'Overview',
                path: '/docs/xml',
                id: 'xml-overview',
                icon: FileCode2,
            },
            {
                title: 'Layout',
                path: '/docs/xml/layout',
                id: 'layout',
                icon: LayoutTemplate,
            },
            {
                title: 'Components',
                path: '/docs/xml/components',
                id: 'components',
                icon: Blocks,
            },
        ],
    },
];

/** Renders a docs page using the shared docs shell. */
export default function DocsPage({ content }: DocsPageProps) {
    const location = useLocation();
    const contentRef = useRef<HTMLDivElement>(null);
    const [pageToc, setPageToc] = useState<PageTocItem[]>([]);
    const [activePageTocHref, setActivePageTocHref] = useState('');
    // Prefer the longest matching path so nested pages do not resolve to their section overview.
    const currentItem = DOC_GROUPS.flatMap((group) => group.items).reduce<DocItem | undefined>((match, item) => {
        const isPathMatch = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

        if (!isPathMatch) {
            return match;
        }

        if (!match || item.path.length > match.path.length) {
            return item;
        }

        return match;
    }, undefined);
    const currentGroup = DOC_GROUPS.find((group) => group.items.some((item) => item.id === currentItem?.id));
    const pageLabel = currentItem?.title ?? 'Overview';
    const pagePath = currentItem?.path ?? '/docs';
    const isRootDocsPage = pagePath === '/docs';
    const isSectionOverviewPage = !isRootDocsPage && currentItem?.id === currentGroup?.items[0]?.id;
    const parsedDoc = parseMarkdownDoc(content);

    useEffect(() => {
        const contentElement = contentRef.current;
        let removeListeners = () => {};

        if (!contentElement) {
            setPageToc([]);
            setActivePageTocHref('');
            return;
        }

        // Wait for the routed docs content to commit before reading generated heading ids.
        const frame = window.requestAnimationFrame(() => {
            const headings = Array.from(contentElement.querySelectorAll<HTMLHeadingElement>('h2[id]'))
                .filter((heading) => heading.id)
                .map((heading) => {
                    const label = Array.from(heading.childNodes)
                        .filter((node) => node.nodeName.toLowerCase() !== 'a')
                        .map((node) => node.textContent ?? '')
                        .join(' ')
                        .trim();

                    return {
                        href: `#${heading.id}`,
                        label,
                    };
                })
                .filter((item) => item.label);

            setPageToc(headings);

            const updateActivePageTocHref = () => {
                // Mark the current section from the top-most visible heading.
                const nextActiveHref =
                    headings
                        .map((item) => ({
                            href: item.href,
                            top: document.querySelector(item.href)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
                        }))
                        .filter((item) => item.top <= 120)
                        .at(-1)?.href ??
                    headings[0]?.href ??
                    '';

                setActivePageTocHref(nextActiveHref);
            };

            updateActivePageTocHref();

            window.addEventListener('scroll', updateActivePageTocHref, { passive: true });
            window.addEventListener('resize', updateActivePageTocHref);

            removeListeners = () => {
                window.removeEventListener('scroll', updateActivePageTocHref);
                window.removeEventListener('resize', updateActivePageTocHref);
            };
        });

        return () => {
            window.cancelAnimationFrame(frame);
            removeListeners();
        };
    }, [location.pathname, parsedDoc.content]);

    return (
        <SidebarProvider defaultOpen>
            <Sidebar side="left" variant="sidebar" collapsible="offcanvas" className="group-data-[side=left]:border-r-0">
                <SidebarHeader className="h-12 justify-end p-2">
                    <Link
                        to="/"
                        className="flex cursor-pointer items-end justify-center gap-2 text-[1.375rem] font-semibold text-card-foreground transition-opacity hover:opacity-80"
                    >
                        <Wordmark className="text-base" />
                    </Link>
                </SidebarHeader>

                <SidebarSeparator />

                <SidebarContent>
                    {DOC_GROUPS.map((group) => (
                        <SidebarGroup key={group.title} className="px-2 py-1">
                            <SidebarGroupLabel className="text-muted-foreground font-normal">{group.title}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = currentItem?.id === item.id;

                                        return (
                                            <SidebarMenuItem key={item.id}>
                                                <SidebarMenuButton
                                                    render={<Link to={item.path} />}
                                                    isActive={isActive}
                                                    variant={isActive ? 'outline' : 'default'}
                                                    className="text-sidebar-foreground/70 hover:bg-muted hover:text-foreground data-active:bg-muted data-active:text-foreground"
                                                >
                                                    <item.icon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                                                    {item.title}
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}
                </SidebarContent>
            </Sidebar>

            <SidebarInset className="pointer-events-none fixed top-1 right-1 bottom-1 left-1 z-20 !w-auto overflow-hidden rounded-lg border border-border bg-background/0 transition-[left] lg:top-2 lg:right-2 lg:bottom-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:peer-data-[state=collapsed]:left-2">
                <div className="flex h-full w-full flex-col shadow-sm">
                    <div className="pointer-events-auto shrink-0 border-b border-border bg-card">
                        <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 lg:px-6">
                            <SidebarTrigger className="shrink-0 cursor-pointer" />

                            <div className="min-w-0 justify-self-center">
                                <div className="mx-auto w-full max-w-2xl">
                                    <UIBreadcrumb>
                                        <BreadcrumbList>
                                            <BreadcrumbItem>
                                                <BreadcrumbLink
                                                    render={(props) => (
                                                        <Link {...props} to="/docs" className="transition-colors hover:text-foreground">
                                                            Documentation
                                                        </Link>
                                                    )}
                                                />
                                            </BreadcrumbItem>
                                            {!isRootDocsPage ? (
                                                <>
                                                    <BreadcrumbSeparator />
                                                    <BreadcrumbItem>
                                                        <BreadcrumbLink
                                                            render={(props) => (
                                                                <Link
                                                                    {...props}
                                                                    to={currentGroup?.items[0]?.path ?? '/docs'}
                                                                    className="transition-colors hover:text-foreground"
                                                                >
                                                                    {currentGroup?.title ?? 'Overview'}
                                                                </Link>
                                                            )}
                                                        />
                                                    </BreadcrumbItem>
                                                    {!isSectionOverviewPage ? (
                                                        <>
                                                            <BreadcrumbSeparator />
                                                            <BreadcrumbItem>
                                                                <BreadcrumbLink
                                                                    render={(props) => (
                                                                        <Link {...props} to={pagePath} className="font-medium text-foreground">
                                                                            {pageLabel}
                                                                        </Link>
                                                                    )}
                                                                />
                                                            </BreadcrumbItem>
                                                        </>
                                                    ) : null}
                                                </>
                                            ) : null}
                                        </BreadcrumbList>
                                    </UIBreadcrumb>
                                </div>
                            </div>

                            <a
                                href={apiUrl('/auth/login/oidc')}
                                className={cn(buttonVariants({ size: 'sm' }), 'h-7 rounded-md bg-foreground px-3 text-xs text-background hover:bg-foreground/90')}
                            >
                                Login
                            </a>
                        </div>
                    </div>
                </div>
            </SidebarInset>

            <div className="pointer-events-none fixed top-1 right-1 bottom-1 left-1 z-0 rounded-lg bg-card transition-[left] lg:top-2 lg:right-2 lg:bottom-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:peer-data-[state=collapsed]:left-2" />
            <div className="pointer-events-none fixed top-0 right-1 left-1 z-[15] h-[5px] bg-background transition-[left] lg:right-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:h-[9px] lg:peer-data-[state=collapsed]:left-2" />
            <div className="pointer-events-none fixed right-1 bottom-0 left-1 z-[15] h-1 bg-background transition-[left] lg:right-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:h-2 lg:peer-data-[state=collapsed]:left-2" />
            <div className="pointer-events-none fixed top-0 bottom-0 left-0 z-[15] w-[5px] bg-background lg:left-[calc(var(--sidebar-width)-1px)] lg:w-[9px] lg:peer-data-[state=collapsed]:left-0" />
            <div className="pointer-events-none fixed top-0 right-0 bottom-0 z-[15] w-[5px] bg-background lg:w-[9px]" />

            <div className="relative z-10 w-full px-1 pb-1 pt-[4.25rem] lg:px-2 lg:pb-2 lg:pt-[4.375rem]">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_14rem]">
                    <div ref={contentRef} className="px-4 pt-4 pb-32 lg:px-6 lg:pt-6 lg:pb-40">
                        <div className="mx-auto w-full max-w-[56rem]">
                            <MarkdownDoc content={parsedDoc.content} metadata={parsedDoc.metadata} />
                        </div>
                    </div>

                    <aside className="hidden px-5 pt-4 pb-8 lg:fixed lg:top-[4.5rem] lg:right-2 lg:block lg:h-[calc(100vh-5rem)] lg:w-56 lg:overflow-y-auto lg:pt-6">
                        <div className="relative pl-4">
                            <div className="pointer-events-none absolute top-1 bottom-1 left-[0.55rem] w-px bg-border" />
                            <div className="flex flex-col gap-4">
                                <div className="pl-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">On this page</div>
                                <nav aria-label="On this page">
                                    <div className="space-y-1.5 text-sm">
                                        {pageToc.map((item) => {
                                            const isActive = activePageTocHref === item.href;

                                            return (
                                                <div key={item.href} className="relative">
                                                    <span
                                                        aria-hidden="true"
                                                        className={`absolute left-[-0.55rem] top-1.5 h-5 w-px rounded-full transition-colors ${
                                                            isActive ? 'bg-primary' : 'bg-transparent'
                                                        }`}
                                                    />
                                                    <A
                                                        href={item.href}
                                                        className={`block pl-3 no-underline transition-colors hover:text-foreground ${
                                                            isActive ? 'text-foreground' : 'text-muted-foreground'
                                                        }`}
                                                    >
                                                        {item.label}
                                                    </A>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </nav>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </SidebarProvider>
    );
}

/** Renders a markdown-backed docs article. */
export function MarkdownDoc({ content, metadata }: { content: string; metadata?: MarkdownDocMetadata }) {
    const parsedDoc = metadata ? { metadata, content } : parseMarkdownDoc(content);
    const blocks = splitMarkdownBlocks(parsedDoc.content);

    return (
        <article className="mx-auto w-full max-w-2xl space-y-6">
            {blocks.map((block, index) => {
                if (block.kind === 'tabs') {
                    return <MarkdownTabs key={`tabs-${index}`} tabs={block.tabs} />;
                }

                return (
                    <ReactMarkdown key={`markdown-${index}`} components={markdownComponents}>
                        {block.content}
                    </ReactMarkdown>
                );
            })}
            {parsedDoc.metadata.lastUpdated || parsedDoc.metadata.editUrl ? (
                <footer className="flex flex-col gap-1 border-t border-border pt-4 text-xs font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    {parsedDoc.metadata.lastUpdated ? <span>Last updated {parsedDoc.metadata.lastUpdated}</span> : <span />}
                    {parsedDoc.metadata.editUrl ? (
                        <A href={parsedDoc.metadata.editUrl} target="_blank" rel="noopener noreferrer">
                            Edit this page in GitHub
                        </A>
                    ) : null}
                </footer>
            ) : null}
        </article>
    );
}

/** Parses optional YAML frontmatter from a docs markdown file. */
function parseMarkdownDoc(content: string): ParsedMarkdownDoc {
    const { content: body, data } = matter(content) as {
        content: string;
        data: { lastUpdated?: string; editUrl?: string };
    };

    return {
        metadata: {
            lastUpdated: data.lastUpdated ?? '',
            editUrl: data.editUrl ?? '',
        },
        content: body,
    };
}

const markdownComponents: Components = {
    h1: ({ children }: { children?: ReactNode }) => <MarkdownHeading level="h1">{children}</MarkdownHeading>,
    h2: ({ children }: { children?: ReactNode }) => <MarkdownHeading level="h2">{children}</MarkdownHeading>,
    h3: ({ children }: { children?: ReactNode }) => <MarkdownHeading level="h3">{children}</MarkdownHeading>,
    h4: ({ children }: { children?: ReactNode }) => <MarkdownHeading level="h4">{children}</MarkdownHeading>,
    p: ({ children }: { children?: ReactNode }) => <P className="max-w-2xl text-muted-foreground">{children}</P>,
    ul: ({ children }: { children?: ReactNode }) => <Ul className="max-w-2xl text-muted-foreground">{children}</Ul>,
    ol: ({ children }: { children?: ReactNode }) => <Ol className="max-w-2xl text-muted-foreground">{children}</Ol>,
    li: ({ children }: { children?: ReactNode }) => <Li>{children}</Li>,
    a: ({ href, children }: { href?: string; children?: ReactNode }) => <MarkdownLink href={href}>{children}</MarkdownLink>,
    code: (props: MarkdownCodeProps) => <MarkdownCode {...props} />,
};

/** Renders a tabbed docs block parsed from ::: tabs markdown. */
function MarkdownTabs({ tabs }: { tabs: MarkdownTab[] }) {
    const defaultValue = tabs[0]?.label ?? '';

    return (
        <Tabs defaultValue={defaultValue} className="!gap-3">
            <TabsList variant="line">
                {tabs.map((tab) => (
                    <TabsTrigger key={tab.label} value={tab.label}>
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>
            {tabs.map((tab) => (
                <TabsContent key={tab.label} value={tab.label} className="!pt-0">
                    <ReactMarkdown components={markdownComponents}>{tab.content}</ReactMarkdown>
                </TabsContent>
            ))}
        </Tabs>
    );
}

/** Renders a markdown heading with a generated anchor id. */
function MarkdownHeading({ children, level }: { children: ReactNode; level: 'h1' | 'h2' | 'h3' | 'h4' }) {
    const text = extractText(children);
    const id = slugifyText(text);
    const anchorClassName = level === 'h1' || level === 'h2' ? '-translate-x-7' : '-translate-x-5';

    return (
        <Heading anchorClassName={anchorClassName} id={id} level={level} className="text-foreground">
            {children}
        </Heading>
    );
}

/** Renders internal docs links with client-side routing. */
function MarkdownLink({ children, href }: { children: ReactNode; href?: string }) {
    if (!href) {
        return <A>{children}</A>;
    }

    // Keep docs routes on the client and open external references in a new tab.
    if (href.startsWith('/')) {
        return (
            <Link to={href} className="font-medium text-foreground hover:underline">
                {children}
            </Link>
        );
    }

    return (
        <A href={href} target="_blank" rel="noopener noreferrer">
            {children}
        </A>
    );
}

/** Renders inline code or fenced code blocks. */
function MarkdownCode({ children, className, inline }: MarkdownCodeProps) {
    const code = String(children).replace(/\n$/, '');
    const isInline = inline ?? !className?.startsWith('language-');

    if (isInline) {
        return <Code className={className}>{code}</Code>;
    }

    const language = className?.match(/language-([\w-]+)/)?.[1] ?? 'text';

    // XML examples get the interactive preview window used elsewhere in the app.
    if (language === 'xml') {
        return <XmlWindow>{code}</XmlWindow>;
    }

    return <CodeBlock language={language}>{code}</CodeBlock>;
}

/** Splits markdown into regular blocks and tabs directives. */
function splitMarkdownBlocks(content: string): MarkdownBlock[] {
    const lines = content.split('\n');
    const blocks: MarkdownBlock[] = [];
    const markdownLines: string[] = [];
    let tabs: MarkdownTab[] = [];
    let tabLabel = '';
    let tabLines: string[] = [];
    let inTabs = false;

    // Keep regular markdown together, but peel out tabs containers so they can render as interactive UI.
    const flushMarkdown = () => {
        const markdown = markdownLines.join('\n').trim();

        if (markdown) {
            blocks.push({ kind: 'markdown', content: markdown });
        }

        markdownLines.length = 0;
    };

    // Tabs are declared as a container with one or more `== label` sections.
    const flushTab = () => {
        if (!tabLabel) {
            tabLines.length = 0;
            return;
        }

        const content = tabLines.join('\n').trim();

        tabs.push({ label: tabLabel, content });
        tabLabel = '';
        tabLines.length = 0;
    };

    for (const line of lines) {
        const trimmed = line.trim();

        if (!inTabs) {
            if (trimmed === '::: tabs') {
                flushMarkdown();
                inTabs = true;
                continue;
            }

            markdownLines.push(line);
            continue;
        }

        if (trimmed === ':::') {
            flushTab();

            if (tabs.length > 0) {
                blocks.push({ kind: 'tabs', tabs });
            }

            tabs = [];
            inTabs = false;
            continue;
        }

        if (trimmed.startsWith('== ')) {
            flushTab();
            tabLabel = trimmed.slice(3).trim();
            continue;
        }

        if (!tabLabel && trimmed === '') {
            continue;
        }

        tabLines.push(line);
    }

    if (inTabs) {
        markdownLines.push('::: tabs');

        if (tabs.length > 0 || tabLabel || tabLines.length > 0) {
            if (tabLabel || tabLines.length > 0) {
                markdownLines.push('');
                markdownLines.push(...tabs.flatMap((tab) => ['== ' + tab.label, tab.content]));
            }
        }
    }

    flushMarkdown();

    return blocks;
}

/** Extracts plain text from markdown heading children for slug generation. */
function extractText(node: ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }

    if (Array.isArray(node)) {
        return node.map((child) => extractText(child)).join(' ');
    }

    if (node && typeof node === 'object' && 'props' in node) {
        return extractText((node as { props?: { children?: ReactNode } }).props?.children);
    }

    return '';
}

/** Converts heading text into a URL-safe slug. */
function slugifyText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
