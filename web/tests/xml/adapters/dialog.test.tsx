import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createContext, parseFragment, renderXmlToMarkup } from '../helpers';

const seen = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }));

vi.mock('@/components/ui/Dialog', () => ({
    Dialog: (props: Record<string, unknown>) => {
        seen.props.push(props);

        return null;
    },
}));

describe('Dialog', () => {
    beforeEach(() => {
        seen.props.length = 0;
    });

    it.each([
        {
            expected: 'fullscreen',
            name: 'requests the fullscreen variant when fullscreen is set',
            property: 'variant',
            xml: '<Dialog title="Contract" fullscreen="true">Content</Dialog>',
        },
        {
            expected: undefined,
            name: 'uses the standard variant by default',
            property: 'variant',
            xml: '<Dialog title="Contract">Content</Dialog>',
        },
        {
            expected: '90%',
            name: 'passes a custom width through to the dialog',
            property: 'width',
            xml: '<Dialog title="Contract" width="90%">Content</Dialog>',
        },
        {
            expected: '90vh',
            name: 'passes a custom height through to the dialog maximum height',
            property: 'maxHeight',
            xml: '<Dialog title="Contract" height="90vh">Content</Dialog>',
        },
    ])('$name', ({ expected, property, xml }) => {
        // Arrange
        const context = createContext();

        // Act
        renderXmlToMarkup(parseFragment(xml), context);

        // Assert
        expect(seen.props).toHaveLength(1);
        expect(seen.props[0]?.[property]).toBe(expected);
    });
});
