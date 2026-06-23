import { XmlWindow } from '@/components/XmlWindow';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('XmlWindow', () => {
    it('shows the source editor by default', () => {
        // The docs wrapper should render the source pane first, not the preview canvas.
        const output = renderToStaticMarkup(createElement(XmlWindow, null, '<Button data-test="x">Save</Button>'));

        expect(output).toContain('h-[28rem]');
    });
});
