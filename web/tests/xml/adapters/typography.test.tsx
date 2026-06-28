import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Typography', () => {
    /* The runtime should apply shared typographic defaults to HTML bridge tags. */
    it('renders styled heading and list markup end to end', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<H1 i18n="Page title" /><H2 i18n="Section" /><H3 i18n="Subsection" /><H4 i18n="Detail" /><P i18n="Body text" /><Code i18n="snippet" /><A href="/docs" i18n="docs" /><Ul><Li i18n="First" /><Li i18n="Second" /></Ul><Ol><Li i18n="One" /><Li i18n="Two" /></Ol>'
            )
        );

        expect(output).toContain('class="group relative scroll-m-20 text-4xl font-semibold tracking-tight"');
        expect(output).toContain('class="group relative scroll-m-20 text-3xl font-semibold tracking-tight"');
        expect(output).toContain('class="group relative scroll-m-20 text-2xl font-semibold tracking-tight"');
        expect(output).toContain('class="group relative scroll-m-20 text-xl font-semibold tracking-tight"');
        expect(output).toContain(
            'class="absolute left-0 top-1/2 inline-flex -translate-y-1/2 items-center text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 -translate-x-7"'
        );
        expect(output).toContain(
            'class="absolute left-0 top-1/2 inline-flex -translate-y-1/2 items-center text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 -translate-x-5"'
        );
        expect(output).toContain('href="#page-title"');
        expect(output).toContain('href="#section"');
        expect(output).toContain('href="#subsection"');
        expect(output).toContain('href="#detail"');
        expect(output).toContain('aria-label="Link to this heading"');
        expect(output).toContain('class="leading-7"');
        expect(output).toContain('class="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground"');
        expect(output).toContain('class="ml-6 list-disc space-y-2"');
        expect(output).toContain('class="ml-6 list-decimal space-y-2"');
        expect(output).toContain('Page title');
        expect(output).toContain('docs');
    });
});
