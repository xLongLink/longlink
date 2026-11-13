// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, vi, expect } from 'vitest';
import { renderStatic, withMounted } from '../../render';
import {
    CodeBlock,
    CodeBlockCopyButton,
    CodeBlockExpandButton,
    CodeBlockHeader,
    CodeBlockTitle
} from '@/components/reui/code-block/code-block';

it('renders code as text rather than executable markup', () => {
    const output = renderStatic(<CodeBlock code={'<script>alert(1)</script>'} language="html" />);

    expect(output.textContent).toContain('<script>alert(1)</script>');
    expect(output.querySelector('script')).toBeNull();
});

it('copies source including final newlines independently of the bounded surface and line numbers', async () => {
    // Presentation controls must not enter the clipboard payload.
    const code = 'first\n\n<script>not executable</script>\n';
    await withMounted(
        <CodeBlock code={code} language="html" showLineNumbers highlightedLines={[3]} maxLines={2}>
            <CodeBlockHeader>
                <CodeBlockTitle>Example</CodeBlockTitle>
                <CodeBlockCopyButton />
            </CodeBlockHeader>
            <CodeBlockExpandButton />
        </CodeBlock>,
        async (output) => {
            const copy = output.querySelector<HTMLButtonElement>('[aria-label="Copy code"]');
            const expand = output.querySelector<HTMLButtonElement>('[data-slot="code-block-expand"] button');

            if (!copy || !expand) throw new Error('Expected code controls');
            expect(expand.getAttribute('aria-expanded')).toBe('false');
            await act(async () => copy.click());
            expect(await navigator.clipboard.readText()).toBe(code);
            expect(expand.getAttribute('aria-expanded')).toBe('false');
            expect(copy.getAttribute('aria-label')).toBe('Copied');
            await act(async () => expand.click());
            expect(expand.getAttribute('aria-expanded')).toBe('true');
            expect(output.querySelector('[data-highlighted]')?.getAttribute('data-code-line')).toBe('3');
            expect(output.querySelector('script')).toBeNull();
        }
    );
});

it('announces a denied clipboard write and permits a successful retry', async () => {
    // Denied browser permission must not claim success or disclose exception details.
    await navigator.clipboard.writeText('existing clipboard');
    await withMounted(
        <CodeBlock code="retry source">
            <CodeBlockCopyButton />
        </CodeBlock>,
        async (output) => {
            const copy = output.querySelector<HTMLButtonElement>('[aria-label="Copy code"]');

            if (!copy) throw new Error('Expected copy control');

            const write = vi
                .spyOn(navigator.clipboard, 'writeText')
                .mockRejectedValueOnce(new Error('private details'));

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
                expect(copy.hasAttribute('data-copy-failed')).toBe(false);
            } finally {
                write.mockRestore();
            }
        }
    );
});

it('keeps highlighted untrusted code as text', async () => {
    // Exercise the real tokenizer-to-React path, not just its plain-text fallback.
    const code = '<script>alert(1)</script><img src=x onerror="alert(2)">';
    await withMounted(<CodeBlock code={code} language="html" />, async (output) => {
        await vi.waitFor(() => expect(output.querySelector('code [style*="--cb-c"]')).not.toBeNull());
        expect(output.querySelector('code')?.textContent).toBe(code);
        expect(output.querySelector('script, img')).toBeNull();
    });
});

it('replaces highlighted content with readable plain text without tokenizing a large source', async () => {
    // A transformer observes tokenization without replacing the real highlighting boundary.
    const preprocess = vi.fn((source: string) => source);
    const transformers = [{ preprocess }];
    const large = '<img src=x onerror="alert(1)">'.repeat(2000);

    function Preview() {
        const [code, setCode] = useState('<strong>initial</strong>');

        return (
            <>
                <button type="button" onClick={() => setCode(large)}>
                    Load large source
                </button>
                <CodeBlock code={code} language="html" transformers={transformers} />
            </>
        );
    }

    await withMounted(<Preview />, async (output) => {
        await vi.waitFor(() => expect(output.querySelector('code [style*="--cb-c"]')).not.toBeNull());
        const passes = preprocess.mock.calls.length;
        const change = output.querySelector<HTMLButtonElement>('button');

        if (!change) throw new Error('Expected source control');
        await act(async () => change.click());
        expect(output.querySelector('code')?.textContent).toBe(large);
        expect(output.querySelector('code [style*="--cb-c"], img')).toBeNull();
        expect(preprocess.mock.calls).toHaveLength(passes);
    });
});

it('keeps a short replacement readable when the expand control becomes ineligible', async () => {
    function Preview() {
        const [short, setShort] = useState(false);

        return (
            <>
                <button type="button" onClick={() => setShort(!short)}>
                    Change source
                </button>
                <CodeBlock code={short ? 'short' : 'one\ntwo\nthree'} maxLines={2}>
                    <CodeBlockExpandButton />
                </CodeBlock>
            </>
        );
    }

    await withMounted(<Preview />, async (output) => {
        const change = output.querySelector<HTMLButtonElement>('button');

        if (!change) throw new Error('Expected source control');
        expect(output.querySelector('[data-slot="code-block-expand"]')).not.toBeNull();
        await act(async () => change.click());
        expect(output.querySelector('[data-slot="code-block-expand"]')).toBeNull();
        expect(output.querySelector('code')?.textContent).toBe('short');
        expect(output.querySelector('[role="region"]')?.hasAttribute('hidden')).toBe(false);
    });
});
