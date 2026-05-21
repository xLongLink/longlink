import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Hero', () => {
    /* The hero action slot should flow horizontally. */
    it('renders hero action in a horizontal row', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Hero><HeroTitle>Title</HeroTitle><HeroDescription>Description</HeroDescription><HeroAction><Button>One</Button><Button>Two</Button></HeroAction></Hero>'
            )
        );

        expect(output).toContain('data-slot="hero-action"');
        expect(output).toContain('One');
        expect(output).toContain('Two');
    });
});
