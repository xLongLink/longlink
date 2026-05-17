import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Hero', () => {
    /* The hero content slot should flow horizontally. */
    it('renders hero content in a horizontal row', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Hero><HeroTitle>Title</HeroTitle><HeroDescription>Description</HeroDescription><HeroContent><Button>One</Button><Button>Two</Button></HeroContent></Hero>'
            )
        );

        expect(output).toContain('data-slot="hero-content"');
        expect(output).toContain('flex-row');
        expect(output).toContain('One');
        expect(output).toContain('Two');
    });
});
