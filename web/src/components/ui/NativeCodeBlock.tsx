import { cn } from 'cn';
import c from 'shiki/langs/c.mjs';
import go from 'shiki/langs/go.mjs';
import cpp from 'shiki/langs/cpp.mjs';
import css from 'shiki/langs/css.mjs';
import jsx from 'shiki/langs/jsx.mjs';
import lua from 'shiki/langs/lua.mjs';
import php from 'shiki/langs/php.mjs';
import sql from 'shiki/langs/sql.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import xml from 'shiki/langs/xml.mjs';
import hack from 'shiki/langs/hack.mjs';
import html from 'shiki/langs/html.mjs';
import java from 'shiki/langs/java.mjs';
import json from 'shiki/langs/json.mjs';
import less from 'shiki/langs/less.mjs';
import ruby from 'shiki/langs/ruby.mjs';
import rust from 'shiki/langs/rust.mjs';
import scss from 'shiki/langs/scss.mjs';
import toml from 'shiki/langs/toml.mjs';
import yaml from 'shiki/langs/yaml.mjs';
import swift from 'shiki/langs/swift.mjs';
import kotlin from 'shiki/langs/kotlin.mjs';
import python from 'shiki/langs/python.mjs';
import graphql from 'shiki/langs/graphql.mjs';
import markdown from 'shiki/langs/markdown.mjs';
import { Button } from '@/components/shadcn/button';
import dockerfile from 'shiki/langs/dockerfile.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import powershell from 'shiki/langs/powershell.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import objectiveC from 'shiki/langs/objective-c.mjs';
import shellscript from 'shiki/langs/shellscript.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';
import { createHighlighterCoreSync } from 'shiki/core';
import githubLight from 'shiki/themes/github-light.mjs';
import { Check, Copy, X, ChevronRight } from 'lucide-react';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { useId, useRef, useMemo, useState, useEffect, type CSSProperties } from 'react';

const highlighter = createHighlighterCoreSync({
    engine: createJavaScriptRegexEngine(),
    langs: [
        ...c,
        ...go,
        ...cpp,
        ...css,
        ...jsx,
        ...lua,
        ...php,
        ...sql,
        ...tsx,
        ...xml,
        ...hack,
        ...html,
        ...java,
        ...json,
        ...less,
        ...ruby,
        ...rust,
        ...scss,
        ...toml,
        ...yaml,
        ...swift,
        ...kotlin,
        ...python,
        ...graphql,
        ...markdown,
        ...dockerfile,
        ...javascript,
        ...powershell,
        ...typescript,
        ...objectiveC,
        ...shellscript,
    ],
    themes: [githubLight, githubDark],
});

const languages = new Set(highlighter.getLoadedLanguages());

const aliases = new Map([
    ['svg', 'xml'],
    ['zsh', 'shellscript'],
    ['h', 'c'],
    ['cc', 'cpp'],
    ['cxx', 'cpp'],
    ['hpp', 'cpp'],
    ['hh', 'cpp'],
    ['hxx', 'cpp'],
]);

/** Renders source tokens as text, with trusted native-only layout options. */
export function NativeCodeBlock(props: {
    code: string;
    language?: string;
    title?: string;
    isWrapped?: boolean;
    hasLineNumbers?: boolean;
    highlightLines?: number[];
    hasCopyButton?: boolean;
    maxHeight?: number | string;
    size?: 'sm' | 'md';
    isCollapsible?: boolean;
    collapsibleThreshold?: number;
    hasLanguageLabel?: boolean;
    container?: 'card' | 'section';
    width?: string;
    className?: string;
}) {
    // Static grammars need no sandbox network authority; bound work on Solution-owned source.
    const language = props.language ?? 'plaintext';

    const tokens = useMemo(() => {
        const syntaxLanguage = aliases.get(language) ?? language;

        if (props.code.length > 50_000 || !languages.has(syntaxLanguage)) return undefined;

        try {
            return highlighter.codeToTokens(props.code, {
                lang: syntaxLanguage,
                themes: { light: 'github-light', dark: 'github-dark' },
            }).tokens;
        } catch {
            return undefined;
        }
    }, [props.code, language]);

    // Preserve the original final-newline and collapse eligibility rules.
    const lines = props.code.split('\n');

    if (lines.length > 1 && lines.at(-1) === '') lines.pop();
    const label = props.hasLanguageLabel !== false && language !== 'plaintext' ? language : null;
    const showHeader = props.title != null || label != null;

    const canCollapse =
        showHeader && props.isCollapsible === true && lines.length >= (props.collapsibleThreshold ?? 10);

    const collapseControl = useMemo(() => (canCollapse ? {} : null), [canCollapse]);
    const [collapsedControl, setCollapsedControl] = useState<object | null>(null);
    const collapsed = collapseControl != null && collapsedControl === collapseControl;
    const regionId = useId();

    const highlights = new Set(props.highlightLines);

    // Only overflowing code adds a keyboard stop; observe both viewport and content resizing.
    const viewport = useRef<HTMLDivElement>(null);
    const content = useRef<HTMLDivElement>(null);
    const [scrollable, setScrollable] = useState(false);
    useEffect(() => {
        const element = viewport.current;

        if (!element) return;

        const measure = () =>
            setScrollable(element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth);

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);

        if (content.current) observer.observe(content.current);

        return () => observer.disconnect();
    }, [props.code, props.isWrapped, props.maxHeight, props.size, collapsed]);

    // Own the clipboard boundary and clear feedback timers and pending writes on unmount.
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const request = useRef(0);
    useEffect(
        () => () => {
            request.current++;
            clearTimeout(timer.current);
        },
        []
    );

    async function copy() {
        const current = ++request.current;
        let state: 'copied' | 'failed' = 'copied';

        try {
            await navigator.clipboard.writeText(props.code);
        } catch {
            state = 'failed';
        }

        if (current !== request.current) return;
        clearTimeout(timer.current);
        setCopyState(state);
        timer.current = setTimeout(() => setCopyState('idle'), 2000);
    }

    // Copy remains separate from the disclosure and never covers source text.
    const copyLabel =
        copyState === 'failed' ? 'Failed to copy value to clipboard.' : copyState === 'copied' ? 'Copied' : 'Copy code';

    const CopyIcon = copyState === 'failed' ? X : copyState === 'copied' ? Check : Copy;

    const copyButton =
        props.hasCopyButton !== false ? (
            <Button
                type="button"
                variant="ghost"
                size={showHeader ? 'icon-sm' : 'icon'}
                className="view-code-copy"
                aria-label={copyLabel}
                title={copyState === 'failed' ? copyLabel : 'Copy code'}
                onClick={() => {
                    void copy();
                }}
            >
                <CopyIcon aria-hidden="true" />
            </Button>
        ) : null;

    const heading = (
        <span className="view-code-title">
            {canCollapse && (
                <ChevronRight
                    aria-hidden="true"
                    className="view-code-chevron"
                    data-expanded={!collapsed || undefined}
                />
            )}
            {props.title && <span className="view-code-filename">{props.title}</span>}
            {label && <span className="view-code-language">{label}</span>}
        </span>
    );

    const style: CSSProperties & { '--view-code-gutter': string } = {
        width: props.width ?? '100%',
        '--view-code-gutter': `${String(lines.length).length}ch`,
    };

    // Keep hidden code mounted so toggling does not discard content or its scroll position.
    return (
        <div
            className={cn('view-code-block', props.className)}
            style={style}
            data-size={props.size ?? 'md'}
            data-container={props.container ?? 'card'}
            data-language={language}
            data-fit-content={props.width === 'fit-content' || undefined}
            data-numbered={props.hasLineNumbers || undefined}
            data-wrapped={props.isWrapped || undefined}
            data-header={showHeader || undefined}
            data-corner={(!showHeader && !!copyButton) || undefined}
        >
            {showHeader && (
                <div className="view-code-header">
                    {canCollapse ? (
                        <button
                            type="button"
                            className="view-code-disclosure"
                            aria-expanded={!collapsed}
                            aria-controls={regionId}
                            aria-label={!props.title?.trim() && !label ? 'Code' : undefined}
                            onClick={() => setCollapsedControl(collapsed ? null : collapseControl)}
                        >
                            {heading}
                        </button>
                    ) : (
                        heading
                    )}
                    {copyButton}
                </div>
            )}
            <div
                ref={viewport}
                id={regionId}
                className="view-code-viewport"
                data-scroll-axis="both"
                hidden={collapsed}
                role="group"
                aria-label={label ?? 'Code'}
                tabIndex={scrollable ? 0 : undefined}
                style={{ maxHeight: props.maxHeight }}
            >
                <div ref={content} className="view-code-content">
                    <code>
                        {lines.map((line, index) => (
                            <span
                                className="view-code-line"
                                key={`line-${index + 1}`}
                                data-line={index + 1}
                                data-highlighted={highlights.has(index + 1) || undefined}
                            >
                                <span className="view-code-line-content">
                                    {tokens?.[index]?.length
                                        ? tokens[index].map((token) => {
                                              const style: CSSProperties &
                                                  Record<`--cb-${string}`, string | undefined> = {
                                                  '--cb-c': token.color,
                                                  '--cb-cd': token.htmlStyle?.['--shiki-dark'] ?? token.color,
                                              };

                                              return (
                                                  <span key={token.offset} style={style}>
                                                      {token.content}
                                                  </span>
                                              );
                                          })
                                        : line || '\u200b'}
                                </span>
                            </span>
                        ))}
                    </code>
                </div>
            </div>
            {!showHeader && copyButton && <div className="view-code-corner">{copyButton}</div>}
            <span className="sr-only" role={copyState === 'failed' ? 'alert' : 'status'}>
                {copyState === 'idle' ? '' : copyLabel}
            </span>
        </div>
    );
}
