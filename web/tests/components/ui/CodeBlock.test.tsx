// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, vi, expect } from 'vitest';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { renderStatic, withMounted } from '../../render';

it('renders code as text rather than executable markup', () => {
    // Act
    const output = renderStatic(<CodeBlock code={'<script>alert(1)</script>'} language="html" />);

    // Assert
    expect(output.textContent).toContain('<script>alert(1)</script>');
    expect(output.querySelector('script')).toBeNull();
});

it('copies exact source including final newlines, independently of collapse and line numbers', async () => {
    // Clipboard contents must not include presentation-only labels, gutters, or empty-line placeholders.
    const code = 'first\n\n<script>not executable</script>\n';
    await withMounted(
        <CodeBlock
            code={code}
            title="Example"
            hasLineNumbers
            highlightLines={[3]}
            isCollapsible
            collapsibleThreshold={3}
        />,
        async (output) => {
            const toggle = output.querySelector<HTMLButtonElement>('[aria-expanded]');
            const copy = output.querySelector<HTMLButtonElement>('[aria-label="Copy code"]');
            const source = output.querySelector('code');

            if (!toggle || !copy || !source) throw new Error('Expected code controls');
            const viewport = output.querySelector(`[id="${toggle.getAttribute('aria-controls')}"]`);

            await act(async () => toggle.click());
            expect(toggle.getAttribute('aria-expanded')).toBe('false');
            expect(viewport?.hasAttribute('hidden')).toBe(true);
            expect(output.querySelector('code')).toBe(source);
            await act(async () => copy.click());
            expect(await navigator.clipboard.readText()).toBe(code);
            expect(toggle.getAttribute('aria-expanded')).toBe('false');
            expect(copy.getAttribute('aria-label')).toBe('Copied');
            expect(output.querySelector('[role="status"]')?.textContent).toBe('Copied');

            await act(async () => toggle.click());
            expect(viewport?.hasAttribute('hidden')).toBe(false);
            expect(output.querySelector('code')).toBe(source);
            expect(source.textContent).toContain('<script>not executable</script>');
            expect(output.querySelectorAll('[data-line]').length).toBe(3);
            expect(output.querySelector('[data-highlighted]')?.getAttribute('data-line')).toBe('3');
        }
    );
});

it('announces a denied clipboard write and permits a successful retry', async () => {
    // A denied browser permission must not claim success or expose the underlying exception.
    await navigator.clipboard.writeText('existing clipboard');
    await withMounted(<CodeBlock code="retry source" />, async (output) => {
        const copy = output.querySelector<HTMLButtonElement>('[aria-label="Copy code"]');

        if (!copy) throw new Error('Expected copy control');
        const write = vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('private details'));

        try {
            await act(async () => copy.click());
            expect(copy.getAttribute('aria-label')).toBe('Failed to copy value to clipboard.');
            expect(output.querySelector('[role="alert"]')?.textContent).toBe('Failed to copy value to clipboard.');
            expect(output.textContent).not.toContain('private details');
            expect(await navigator.clipboard.readText()).toBe('existing clipboard');

            await act(async () => copy.click());
            expect(await navigator.clipboard.readText()).toBe('retry source');
            expect(copy.getAttribute('aria-label')).toBe('Copied');
            expect(output.querySelector('[role="alert"]')).toBeNull();
        } finally {
            write.mockRestore();
        }
    });
});

it('keeps highlighted untrusted code as text', async () => {
    // Exercise the real tokenizer-to-React path, not just its plain-text fallback.
    const code = '<script>alert(1)</script><img src=x onerror="alert(2)">';
    await withMounted(<CodeBlock code={code} language="html" />, async (output) => {
        await vi.waitFor(() => expect(output.querySelector('code [style]')).not.toBeNull());
        expect(output.querySelector('code')?.textContent).toBe(code);
        expect(output.querySelector('script, img')).toBeNull();
    });
});

it('replaces highlighted content with readable plain text when a large source arrives', async () => {
    // Solution-controlled large previews must bypass tokenization without retaining stale tokens.
    const large = '<img src=x onerror="alert(1)">'.repeat(2000);

    function Preview() {
        const [code, setCode] = useState('<strong>initial</strong>');

        return (
            <>
                <button type="button" onClick={() => setCode(large)}>
                    Load large source
                </button>
                <CodeBlock code={code} language="html" />
            </>
        );
    }

    await withMounted(<Preview />, async (output) => {
        expect(output.querySelector('code [style]')).not.toBeNull();
        const change = output.querySelector<HTMLButtonElement>('button');

        if (!change) throw new Error('Expected source control');
        await act(async () => change.click());
        expect(output.querySelector('code')?.textContent).toBe(large);
        expect(output.querySelector('code [style], img')).toBeNull();
    });
});

it('does not leave code hidden when its collapse control becomes ineligible', async () => {
    // A changing preview must not strand new short content behind a removed disclosure.
    function Preview() {
        const [short, setShort] = useState(false);

        return (
            <>
                <button type="button" onClick={() => setShort(!short)}>
                    Change source
                </button>
                <CodeBlock code={short ? 'short' : 'one\ntwo'} title="Preview" isCollapsible collapsibleThreshold={2} />
            </>
        );
    }

    await withMounted(<Preview />, async (output) => {
        const toggle = output.querySelector<HTMLButtonElement>('[aria-expanded]');
        const change = output.querySelector<HTMLButtonElement>('button');

        if (!toggle || !change) throw new Error('Expected preview controls');
        await act(async () => toggle.click());
        await act(async () => change.click());
        expect(output.querySelector('[aria-expanded]')).toBeNull();
        expect(output.querySelector('[data-scroll-axis]')?.hasAttribute('hidden')).toBe(false);
        expect(output.querySelector('code')?.textContent).toBe('short');
        await act(async () => change.click());
        expect(output.querySelector('[aria-expanded]')?.getAttribute('aria-expanded')).toBe('true');
        expect(output.querySelector('[data-scroll-axis]')?.hasAttribute('hidden')).toBe(false);
    });
});

it('does not collapse headerless plaintext even above the threshold', () => {
    // Without a visible control, all code must remain available.
    const output = renderStatic(<CodeBlock code={'one\ntwo'} isCollapsible collapsibleThreshold={1} />);
    expect(output.querySelector('[aria-expanded]')).toBeNull();
    expect(output.querySelector('[data-scroll-axis]')?.hasAttribute('hidden')).toBe(false);
    expect(output.querySelector('code')?.textContent).toBe('onetwo');
});
