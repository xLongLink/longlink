import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Typography', () => {
    /* The runtime should apply shared typographic defaults to HTML bridge tags. */
    it('renders styled heading and list markup end to end', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<H1>Page title</H1><H2>Section</H2><H3>Subsection</H3><H4>Detail</H4><P>Body text with <Code>snippet</Code> and <A href="/docs">docs</A>.</P><Ul><Li>First</Li><Li>Second</Li></Ul><Ol><Li>One</Li><Li>Two</Li></Ol>'
            )
        );

        expect(output).toContain('class="group relative mt-2 scroll-m-20 text-4xl font-semibold tracking-tight"');
        expect(output).toContain(
            'class="group relative mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0"'
        );
        expect(output).toContain('class="group relative mt-8 scroll-m-20 text-2xl font-semibold tracking-tight"');
        expect(output).toContain('class="group relative mt-6 scroll-m-20 text-xl font-semibold tracking-tight"');
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
        expect(output).toContain('class="leading-7 [&amp;:not(:first-child)]:mt-6"');
        expect(output).toContain('class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"');
        expect(output).toContain('class="my-6 ml-6 list-disc space-y-2"');
        expect(output).toContain('class="my-6 ml-6 list-decimal space-y-2"');
        expect(output).toContain('class="leading-7"');
        expect(output).toContain('Page title');
        expect(output).toContain('docs');
    });
});
