import type { Token } from 'marked';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';

import { CodeBlock } from '@/components/CodeBlock';
import { XmlWindow } from '@/components/XmlWindow';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { Ol } from '@/components/ui/ol';
import { P } from '@/components/ui/p';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ul } from '@/components/ui/ul';

export type MarkdownBlock =
    | {
          kind: 'markdown';
          tokens: Token[];
      }
    | {
          kind: 'tabs';
          tabs: MarkdownTab[];
      };

export type MarkdownTab = {
    label: string;
    tokens: Token[];
};

export type MarkdownDocMetadata = {
    lastUpdated: string;
    editUrl: string;
};

/** Renders a pre-parsed markdown document into React nodes. */
export function renderMarkdownDocument(blocks: MarkdownBlock[]): ReactNode {
    return blocks.map((block, index) => {
        if (block.kind === 'tabs') {
            return <MarkdownTabs key={`tabs-${index}`} tabs={block.tabs} />;
        }

        return <MarkdownTokens key={`markdown-${index}`} tokens={block.tokens} />;
    });
}

/** Renders markdown tabs as interactive UI. */
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
                    <MarkdownTokens tokens={tab.tokens} />
                </TabsContent>
            ))}
        </Tabs>
    );
}

/** Renders an ordered markdown token list. */
function MarkdownTokens({ tokens }: { tokens: Token[] }) {
    return <>{renderMarkdownTokens(tokens)}</>;
}

/** Renders a token array recursively. */
function renderMarkdownTokens(tokens: Token[]): ReactNode {
    return tokens.map((token, index) => renderToken(token, index));
}

/** Renders a single markdown token into React. */
function renderToken(token: Token, index: number): ReactNode {
    switch (token.type) {
        case 'heading': {
            const id = slugifyText(token.text);
            const level = `h${token.depth}` as 'h1' | 'h2' | 'h3' | 'h4';
            const anchorClassName = token.depth <= 2 ? '-translate-x-7' : '-translate-x-5';

            return (
                <Heading
                    key={index}
                    anchorClassName={anchorClassName}
                    id={id}
                    level={level}
                    className="text-foreground"
                >
                    {renderInlineTokens(token.tokens ?? [])}
                </Heading>
            );
        }
        case 'paragraph':
            return (
                <P key={index} className="max-w-2xl text-muted-foreground">
                    {renderInlineTokens(token.tokens ?? [])}
                </P>
            );
        case 'list':
            const listToken = token as Extract<Token, { type: 'list' }>;

            return token.ordered ? (
                <Ol key={index} className="max-w-2xl text-muted-foreground">
                    {listToken.items.map((item, itemIndex) => (
                        <Li key={`${index}-${itemIndex}`}>{renderMarkdownTokens(item.tokens ?? [])}</Li>
                    ))}
                </Ol>
            ) : (
                <Ul key={index} className="max-w-2xl text-muted-foreground">
                    {listToken.items.map((item, itemIndex) => (
                        <Li key={`${index}-${itemIndex}`}>{renderMarkdownTokens(item.tokens ?? [])}</Li>
                    ))}
                </Ul>
            );
        case 'list_item':
            return <Fragment key={index}>{renderMarkdownTokens(token.tokens ?? [])}</Fragment>;
        case 'blockquote':
            return (
                <blockquote key={index} className="max-w-2xl border-l-2 border-border pl-4 text-muted-foreground">
                    {renderMarkdownTokens(token.tokens ?? [])}
                </blockquote>
            );
        case 'code': {
            const language = token.lang?.trim() || 'text';

            if (language === 'xml') {
                return <XmlWindow key={index}>{token.text}</XmlWindow>;
            }

            return (
                <CodeBlock key={index} language={language}>
                    {token.text}
                </CodeBlock>
            );
        }
        case 'hr':
            return <hr key={index} className="border-border" />;
        case 'table':
            const tableToken = token as Extract<Token, { type: 'table' }>;

            return (
                <div key={index} className="max-w-2xl overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                {tableToken.header.map((cell, cellIndex) => (
                                    <th
                                        key={cellIndex}
                                        className="border-b border-border px-3 py-2 text-left font-semibold"
                                    >
                                        {renderInlineTokens(cell.tokens ?? [])}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tableToken.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-b border-border/60 last:border-b-0">
                                    {row.map((cell, cellIndex) => (
                                        <td key={cellIndex} className="px-3 py-2 align-top text-muted-foreground">
                                            {renderInlineTokens(cell.tokens ?? [])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        case 'space':
        case 'html':
        case 'def':
            return null;
        default:
            return renderInlineToken(token as Token, index);
    }
}

/** Renders inline markdown tokens. */
function renderInlineTokens(tokens: Token[]): ReactNode {
    return <>{tokens.map((token, index) => renderInlineToken(token, index))}</>;
}

/** Renders inline markdown tokens and simple nested content. */
function renderInlineToken(token: Token, index: number): ReactNode {
    switch (token.type) {
        case 'strong':
            return <strong key={index}>{renderInlineTokens(token.tokens ?? [])}</strong>;
        case 'em':
            return <em key={index}>{renderInlineTokens(token.tokens ?? [])}</em>;
        case 'del':
            return <del key={index}>{renderInlineTokens(token.tokens ?? [])}</del>;
        case 'codespan':
            return <Code key={index}>{token.text}</Code>;
        case 'link': {
            const children = renderInlineTokens(token.tokens ?? []);

            if (token.href.startsWith('/')) {
                return (
                    <Link key={index} to={token.href} className="font-medium text-foreground hover:underline">
                        {children}
                    </Link>
                );
            }

            return (
                <A key={index} href={token.href} target="_blank" rel="noopener noreferrer">
                    {children}
                </A>
            );
        }
        case 'image':
            return <img key={index} src={token.href} alt={token.text} title={token.title ?? undefined} />;
        case 'br':
            return <br key={index} />;
        case 'checkbox':
            return <input key={index} type="checkbox" checked={token.checked} readOnly disabled />;
        case 'text':
        case 'escape':
            return token.text;
        default:
            return token.raw;
    }
}

/** Converts heading text into a URL-safe slug. */
function slugifyText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
