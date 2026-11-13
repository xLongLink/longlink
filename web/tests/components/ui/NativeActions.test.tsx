// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { useLocation } from 'react-router';
import userEvent from '@testing-library/user-event';
import { NativeLink } from '@/components/ui/NativeLink';
import { NativeButton } from '@/components/ui/NativeButton';

/** Exposes actual router state after clicks without replacing navigation. */
function Location() {
    const location = useLocation();

    return (
        <output>
            {location.pathname}
            {location.search}
        </output>
    );
}

it('deduplicates pending actions, reports rejection, and allows a successful retry', async () => {
    let reject: (cause: Error) => void = () => {};

    const pending = new Promise<void>((_, fail) => {
        reject = fail;
    });

    const action = vi.fn<() => Promise<void>>().mockReturnValueOnce(pending).mockResolvedValue(undefined);
    const parent = vi.fn();

    await withMounted(
        <section onClick={parent}>
            <NativeButton label="Save" clickAction={action} />
        </section>,
        async (output) => {
            const button = output.querySelector('button');

            if (!button) throw new Error('Expected Save');

            await act(async () => {
                button.click();
                button.click();
            });
            expect(action).toHaveBeenCalledTimes(1);
            expect(parent).toHaveBeenCalledTimes(1);
            expect(button.getAttribute('aria-busy')).toBe('true');
            expect(output.querySelector('[role="status"]')?.textContent).toBe('Loading');

            await act(async () => reject(new Error('Transport failure')));
            expect(output.querySelector('[role="alert"]')?.textContent).toContain('Please try again.');
            expect(button.disabled).toBe(false);

            await act(async () => button.click());
            expect(action).toHaveBeenCalledTimes(2);
            expect(output.querySelector('[role="alert"]')).toBeNull();
            expect(button.hasAttribute('aria-busy')).toBe(false);
        }
    );
});

it('runs synchronous click cancellation before an async action or router navigation', async () => {
    const action = vi.fn();
    const canceled = vi.fn((event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => event.preventDefault());

    await withMounted(
        <>
            <NativeButton label="Cancel action" onClick={canceled} clickAction={action} />
            <NativeButton label="Cancel navigation" href="/orders" onClick={canceled} clickAction={action} />
            <Location />
        </>,
        async (output) => {
            const button = output.querySelector('button');
            const anchor = output.querySelector('a');

            if (!button || !anchor) throw new Error('Expected action and navigation controls');

            await act(async () => {
                button.click();
                anchor.click();
            });
            expect(canceled).toHaveBeenCalledTimes(2);
            expect(action).not.toHaveBeenCalled();
            expect(output.querySelector('output')?.textContent).toBe('/');
            expect(output.querySelector('[aria-busy="true"]')).toBeNull();
        }
    );
});

it('keeps native submitter data and excludes disabled/loading controls from submission', async () => {
    const submissions: Array<{ title: FormDataEntryValue | null; intent: FormDataEntryValue | null }> = [];
    const action = vi.fn();
    const events = userEvent.setup();

    await withMounted(
        <form
            onSubmit={(event) => {
                event.preventDefault();
                const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
                const data = new FormData(event.currentTarget, submitter);
                submissions.push({ title: data.get('title'), intent: data.get('intent') });
            }}
        >
            <input name="title" defaultValue="Report" />
            <NativeButton label="Preview" clickAction={action} />
            <NativeButton label="Disabled" type="submit" isDisabled />
            <NativeButton label="Loading" type="submit" isLoading />
            <NativeButton label="Publish" type="submit" name="intent" value="publish" />
        </form>,
        async (output) => {
            const buttons = output.querySelectorAll('button');
            const publish = buttons[3];

            if (!publish) throw new Error('Expected submit controls');

            await act(async () => {
                buttons[0]?.click();
                buttons[1]?.click();
                buttons[2]?.click();
            });
            expect(action).toHaveBeenCalledTimes(1);
            expect(submissions).toEqual([]);
            expect(buttons[1]?.disabled).toBe(true);
            expect(buttons[2]?.getAttribute('aria-busy')).toBe('true');

            await act(async () => {
                publish.focus();
                await events.keyboard('{Enter}');
            });
            expect(submissions).toEqual([{ title: 'Report', intent: 'publish' }]);
        }
    );
});

it.each(['link', 'button'] as const)('preserves router and native gestures for a trusted %s link', async (kind) => {
    await withMounted(
        <>
            {kind === 'link' ? (
                <NativeLink href="/orders?filter=open">Orders</NativeLink>
            ) : (
                <NativeButton href="/orders?filter=open" label="Orders" />
            )}
            <Location />
        </>,
        async (output) => {
            const link = output.querySelector('a');

            if (!link) throw new Error('Expected a real anchor');
            expect(link.getAttribute('href')).toBe('/orders?filter=open');

            for (const gesture of [
                { ctrlKey: true },
                { metaKey: true },
                { shiftKey: true },
                { altKey: true },
                { button: 1 },
            ]) {
                const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...gesture });
                await act(async () => {
                    link.dispatchEvent(event);
                });
                expect(event.defaultPrevented).toBe(false);
                expect(output.querySelector('output')?.textContent).toBe('/');
            }

            const middle = new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 });
            await act(async () => {
                link.dispatchEvent(middle);
            });
            expect(middle.defaultPrevented).toBe(false);
            expect(output.querySelector('output')?.textContent).toBe('/');

            // Space scrolls rather than activating a link; Enter retains native link activation.
            const events = userEvent.setup();
            const down = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
            const up = new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true });

            await act(async () => {
                link.focus();
                link.dispatchEvent(down);
                link.dispatchEvent(up);
            });
            expect(down.defaultPrevented).toBe(false);
            expect(up.defaultPrevented).toBe(false);
            expect(output.querySelector('output')?.textContent).toBe('/');
            expect(link.getAttribute('role')).not.toBe('button');

            await act(async () => events.keyboard('{Enter}'));
            expect(output.querySelector('output')?.textContent).toBe('/orders?filter=open');
        }
    );
});

it('leaves external, mailto, downloads and new-tab destinations to native navigation', async () => {
    await withMounted(
        <>
            <NativeLink href="https://example.com/docs" isExternalLink rel="author">
                Docs
            </NativeLink>
            <NativeButton href="mailto:info@longlink.dev" label="Email" />
            <NativeLink href="/report.pdf" download="report.pdf">
                Report
            </NativeLink>
            <NativeButton href="/api/archive" download label="Archive" />
            <NativeButton href="/pricing" target="_blank" label="Pricing" />
            <Location />
        </>,
        async (output) => {
            const links = output.querySelectorAll('a');
            expect(links[0]?.getAttribute('target')).toBe('_blank');
            expect(links[0]?.getAttribute('rel')?.split(' ')).toEqual(
                expect.arrayContaining(['author', 'noopener', 'noreferrer'])
            );
            expect(links[1]?.getAttribute('href')).toBe('mailto:info@longlink.dev');
            expect(links[2]?.getAttribute('download')).toBe('report.pdf');
            expect(links[3]?.hasAttribute('download')).toBe(true);
            expect(links[4]?.getAttribute('rel')?.split(' ')).toEqual(
                expect.arrayContaining(['noopener', 'noreferrer'])
            );

            for (const link of links) {
                const event = new MouseEvent('click', { bubbles: true, cancelable: true });
                await act(async () => {
                    link.dispatchEvent(event);
                });
                expect(event.defaultPrevented).toBe(false);
                expect(output.querySelector('output')?.textContent).toBe('/');
            }
        }
    );
});
