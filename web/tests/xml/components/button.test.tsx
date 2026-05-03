import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '@/xml/components/Button';

describe('Button', () => {
    /* External href buttons should render as anchors and skip the action pipeline. */
    it('renders an anchor when href is external', () => {
        const output = renderToStaticMarkup(
            createElement(Button, { href: 'https://example.com', variant: 'default' }, 'Open')
        );

        expect(output).toContain('<a');
        expect(output).toContain('href="https://example.com"');
        expect(output).toContain('Open');
    });

    /* Plain buttons should remain disabled when pending is set. */
    it('disables normal buttons while pending', () => {
        const output = renderToStaticMarkup(createElement(Button, { pending: true, type: 'button' }, 'Submit'));

        expect(output).toContain('<button');
        expect(output).toContain('disabled');
        expect(output).toContain('Submit');
    });
});
