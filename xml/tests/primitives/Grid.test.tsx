import { describe, it, expect } from 'bun:test';
import { render } from '@testing-library/react';
import { Grid } from '../../src/primitives/Grid';

describe('Grid', () => {
    it('renders a div with display:grid', () => {
        const { container } = render(<Grid />);
        const div = container.firstChild as HTMLElement;
        expect(div.tagName).toBe('DIV');
        expect(div.style.display).toBe('grid');
    });

    it('defaults gap to 1rem', () => {
        const { container } = render(<Grid />);
        const div = container.firstChild as HTMLElement;
        expect(div.style.gap).toBe('1rem');
    });

    it('applies a custom gap', () => {
        const { container } = render(<Grid gap="2rem" />);
        const div = container.firstChild as HTMLElement;
        expect(div.style.gap).toBe('2rem');
    });

    it('applies columns as gridTemplateColumns', () => {
        const { container } = render(<Grid columns="repeat(3, 1fr)" />);
        const div = container.firstChild as HTMLElement;
        expect(div.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
    });

    it('applies align as alignItems', () => {
        const { container } = render(<Grid align="center" />);
        const div = container.firstChild as HTMLElement;
        expect(div.style.alignItems).toBe('center');
    });

    it('applies justify as justifyItems', () => {
        const { container } = render(<Grid justify="end" />);
        const div = container.firstChild as HTMLElement;
        expect(div.style.justifyItems).toBe('end');
    });

    it('merges a custom style prop (extra properties are preserved)', () => {
        const { container } = render(<Grid style={{ backgroundColor: 'red' }} />);
        const div = container.firstChild as HTMLElement;
        expect(div.style.backgroundColor).toBe('red');
        // Core grid display must still be set
        expect(div.style.display).toBe('grid');
    });

    it('custom style can override gap', () => {
        // A style prop key that matches a layout key should win because style is spread last
        const { container } = render(<Grid gap="1rem" style={{ gap: '999px' }} />);
        const div = container.firstChild as HTMLElement;
        expect(div.style.gap).toBe('999px');
    });

    it('renders children inside the grid container', () => {
        const { getByText } = render(
            <Grid>
                <div>Cell A</div>
                <div>Cell B</div>
            </Grid>
        );
        expect(getByText('Cell A')).toBeTruthy();
        expect(getByText('Cell B')).toBeTruthy();
    });
});
