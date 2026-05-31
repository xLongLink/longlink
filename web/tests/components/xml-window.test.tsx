import { XmlWindow } from '@/components/XmlWindow';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('XmlWindow', () => {
    it('defaults to source view', () => {
        // The docs wrapper should show the XML source first, not the rendered preview.
        const output = renderToStaticMarkup(createElement(XmlWindow, null, '<Button data-test="x">Save</Button>'));

        expect(output).toContain('react-syntax-highlighter-line-number');
    });
});
