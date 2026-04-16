import { describe, it, expect } from 'bun:test';
import { render } from '@testing-library/react';
import { Page } from '../../src/primitives/Page';

describe('Page', () => {
    it('renders its children', () => {
        const { getByText } = render(
            <Page>
                <span>Hello</span>
            </Page>
        );
        expect(getByText('Hello')).toBeTruthy();
    });

    it('renders multiple children', () => {
        const { getByText } = render(
            <Page>
                <span>First</span>
                <span>Second</span>
            </Page>
        );
        expect(getByText('First')).toBeTruthy();
        expect(getByText('Second')).toBeTruthy();
    });

    it('renders nothing when no children are provided', () => {
        // Page with no children should not throw and should produce no DOM output
        const { container } = render(<Page />);
        expect(container.firstChild).toBeNull();
    });
});
