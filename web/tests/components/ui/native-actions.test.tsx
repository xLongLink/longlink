// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { useLocation } from 'react-router';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { ApiErrorContext, createErrorReporter } from '@/lib/errors';
import { Button, buttonVariants } from '@/components/longlink/action/button';
import { NativeLink, NativeNavigationLink } from '@/components/custom/native-link';
import { MembershipConfirmation } from '@/components/dialogs/membership-confirmation';

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

it('ignores class overrides supplied outside the typed LongLink Button API', () => {
    const overrides = { className: 'hidden bg-red-500' };
    const output = renderStatic(
        <Button {...overrides} variant="primary">
            Save
        </Button>
    );
    const button = output.querySelector('button');

    expect(button?.classList.contains('hidden')).toBe(false);
    expect(button?.classList.contains('bg-red-500')).toBe(false);
    expect(button?.classList.contains('bg-primary')).toBe(true);
});

it.each([false, true])(
    'deduplicates confirmation with destructive=%s, reports failure, and allows retry',
    async (destructive) => {
        let reject: (cause: Error) => void = () => {};

        const pending = new Promise<void>((_, fail) => {
            reject = fail;
        });

        const action = vi.fn<() => Promise<void>>().mockReturnValueOnce(pending).mockResolvedValue(undefined);
        const notify = vi.fn();
        const close = vi.fn();
        const dismiss = vi.fn();
        const actionLabel = 'Confirm';

        const confirm = async () => {
            await action();
            close();
        };

        await withMounted(
            <ApiErrorContext value={createErrorReporter(notify)}>
                <MembershipConfirmation
                    destructive={destructive}
                    title="Confirm membership change"
                    description="Apply this membership change?"
                    actionLabel={actionLabel}
                    onOpenChange={dismiss}
                    onConfirm={confirm}
                />
            </ApiErrorContext>,
            async () => {
                const button = Array.from(
                    document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button, [role="alertdialog"] button')
                ).find((control) => control.textContent === actionLabel);

                if (!button) throw new Error('Expected confirmation');
                const cancel = Array.from(
                    document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button, [role="alertdialog"] button')
                ).find((control) => control.textContent === 'Cancel');
                if (!cancel) throw new Error('Expected confirmation cancellation');

                await act(async () => {
                    button.click();
                    button.click();
                });
                expect(action).toHaveBeenCalledTimes(1);
                expect(close).not.toHaveBeenCalled();
                expect(button.getAttribute('aria-busy')).toBe('true');
                expect(button.disabled).toBe(true);

                expect(cancel.disabled).toBe(destructive);
                await act(async () => {
                    cancel.click();
                    await userEvent.setup().keyboard('{Escape}');
                });
                if (destructive) {
                    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
                    expect(dismiss).not.toHaveBeenCalled();
                } else {
                    expect(dismiss).toHaveBeenCalledTimes(2);
                    expect(dismiss).toHaveBeenCalledWith(false);
                }

                await act(async () => reject(new Error('Transport failure')));
                expect(notify).toHaveBeenCalledWith(expect.stringContaining('Please try again.'));
                expect(close).not.toHaveBeenCalled();
                expect(button.disabled).toBe(false);
                expect(cancel.disabled).toBe(false);

                await act(async () => button.click());
                expect(action).toHaveBeenCalledTimes(2);
                expect(close).toHaveBeenCalledTimes(1);
                expect(button.hasAttribute('aria-busy')).toBe(false);
            }
        );
    }
);

it.each(['link', 'button'] as const)('preserves router and native gestures for a trusted %s link', async (kind) => {
    await withMounted(
        <>
            {kind === 'link' ? (
                <NativeLink href="/orders?filter=open">Orders</NativeLink>
            ) : (
                <NativeNavigationLink href="/orders?filter=open" className={buttonVariants()}>
                    Orders
                </NativeNavigationLink>
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
                { button: 1 }
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
            <NativeNavigationLink href="mailto:info@longlink.dev" className={buttonVariants()}>
                Email
            </NativeNavigationLink>
            <NativeLink href="/report.pdf" download="report.pdf">
                Report
            </NativeLink>
            <NativeNavigationLink href="/api/archive" download className={buttonVariants()}>
                Archive
            </NativeNavigationLink>
            <NativeNavigationLink href="/pricing" target="_blank" className={buttonVariants()}>
                Pricing
            </NativeNavigationLink>
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
