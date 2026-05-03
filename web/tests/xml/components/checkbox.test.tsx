import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Checkbox } from '@/xml/components/Checkbox';

describe('Checkbox', () => {
    /* Checkbox should render its label, description, and checked state together. */
    it('renders labeled checkbox content', () => {
        const output = renderToStaticMarkup(
            createElement(Checkbox, { label: 'Receive updates', description: 'Email me product news', checked: true })
        );

        expect(output).toContain('Receive updates');
        expect(output).toContain('Email me product news');
        expect(output).toContain('data-checked');
    });
});
