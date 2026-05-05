import { xmlToAST } from '@/xml/compiler';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Checkbox', () => {
    /* Checkbox should render its label, description, and checked state together. */
    it('renders labeled checkbox content', () => {
        const output = renderXmlToMarkup(
            xmlToAST('<Checkbox label="Receive updates" description="Email me product news" checked="true" />')
        );

        expect(output).toContain('Receive updates');
        expect(output).toContain('Email me product news');
        expect(output).toContain('data-checked');
    });
});
