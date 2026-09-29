import { describe, expect, it } from 'vitest';
import { parseFragment, renderXmlToMarkup } from '../helpers';

describe('Dialog', () => {
    it.each([
        {
            expected: 'data-variant="fullscreen"',
            name: 'renders the fullscreen variant when fullscreen is set',
            xml: '<Dialog title="Contract" fullscreen="true">Content</Dialog>',
        },
        {
            expected: 'data-variant="standard"',
            name: 'renders the standard variant by default',
            xml: '<Dialog title="Contract">Content</Dialog>',
        },
        {
            expected: '--x-width:90%',
            name: 'renders a custom width',
            xml: '<Dialog title="Contract" width="90%">Content</Dialog>',
        },
        {
            expected: '--x-maxHeight:90vh',
            name: 'renders a custom maximum height',
            xml: '<Dialog title="Contract" height="90vh">Content</Dialog>',
        },
    ])('$name', ({ expected, xml }) => {
        // Render the XML adapter through the shared dialog rather than replacing it with a prop collector.
        const markup = renderXmlToMarkup(parseFragment(xml));

        expect(markup).toContain('aria-label="Contract"');
        expect(markup).toContain(expected);
    });
});
