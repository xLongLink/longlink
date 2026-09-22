import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createContext, parseFragment, renderXmlToMarkup } from '../helpers';

const seen = vi.hoisted((): { props: Record<string, unknown>[] } => ({ props: [] }));

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

    it('requests the fullscreen variant when fullscreen is set', () => {
        // Arrange
        const context = createContext();

        // Act
        renderXmlToMarkup(parseFragment('<Dialog title="Contract" fullscreen="true">Content</Dialog>'), context);

        // Assert
        expect(seen.props).toHaveLength(1);
        expect(seen.props[0]?.variant).toBe('fullscreen');
    });

    it('uses the standard variant by default', () => {
        // Arrange
        const context = createContext();

        // Act
        renderXmlToMarkup(parseFragment('<Dialog title="Contract">Content</Dialog>'), context);

        // Assert
        expect(seen.props).toHaveLength(1);
        expect(seen.props[0]?.variant).toBeUndefined();
    });

    it('passes a custom width through to the dialog', () => {
        // Arrange
        const context = createContext();

        // Act
        renderXmlToMarkup(parseFragment('<Dialog title="Contract" width="90%">Content</Dialog>'), context);

        // Assert
        expect(seen.props).toHaveLength(1);
        expect(seen.props[0]?.width).toBe('90%');
    });

    it('passes a custom height through to the dialog maximum height', () => {
        // Arrange
        const context = createContext();

        // Act
        renderXmlToMarkup(parseFragment('<Dialog title="Contract" height="90vh">Content</Dialog>'), context);

        // Assert
        expect(seen.props).toHaveLength(1);
        expect(seen.props[0]?.maxHeight).toBe('90vh');
    });
});
