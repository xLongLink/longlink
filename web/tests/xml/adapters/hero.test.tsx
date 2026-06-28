import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Hero', () => {
    /* The hero action slot should flow horizontally. */
    it('renders hero action in a horizontal row', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Hero><HeroTitle i18n="Title" /><HeroDescription i18n="Description" /><HeroAction><Button i18n="One" /><Button i18n="Two" /></HeroAction></Hero>'
            )
        );

        expect(output).toContain('data-slot="hero-action"');
        expect(output).toContain('One');
        expect(output).toContain('Two');
    });
});
