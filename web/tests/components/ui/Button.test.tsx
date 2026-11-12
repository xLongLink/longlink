// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { Form } from '@/components/ui/Form';
import { ReportedError } from '@/lib/reported';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from 'react-error-boundary';
import { IconButton } from '@/components/ui/IconButton';
import { renderStatic, withMounted } from '../../render';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import { LinkNavigationContext } from '@/components/ui/contexts';

it('does not accidentally submit the surrounding form', () => {
    // Act
    const output = renderStatic(<Button label="Run action" />);

    // Assert
    expect(output.querySelector('button')?.getAttribute('type')).toBe('button');
    expect(output.textContent).toContain('Run action');
});

it.each(['submit', 'reset'] as const)('does not expose a disabled native %s action before hydration', (type) => {
    // Aria-disabled controls have no event guard in server HTML, so their native form action must be withheld.
    const output = renderStatic(<Button label="Unavailable" type={type} name="intent" value="publish" disabled />);
    const control = output.querySelector('button');

    expect(control?.getAttribute('type')).toBe('button');
    expect(control?.hasAttribute('name')).toBe(false);
    expect(control?.getAttribute('aria-disabled')).toBe('true');
});

it.each(['button', 'icon'] as const)(
    'locks same-tick %s activations until the action settles without losing focus',
    async (kind) => {
        // A save must run once even when clicks arrive before React commits its loading state.
        let release: () => void = () => {};

        const pending = new Promise<void>((resolve) => {
            release = resolve;
        });

        const action = vi.fn(() => pending);

        try {
            await withMounted(
                kind === 'button' ? (
                    <Button label="Save" onClick={action} />
                ) : (
                    <IconButton label="Save" icon="check" onClick={action} />
                ),
                async (output) => {
                    const control = output.querySelector<HTMLButtonElement>('button');

                    if (!control) throw new Error('Expected the action control');
                    await act(async () => {
                        control.focus();
                        control.click();
                        control.click();
                    });
                    expect(action).toHaveBeenCalledTimes(1);
                    expect(control.getAttribute('aria-busy')).toBe('true');
                    expect(control.getAttribute('aria-label')).toBe('Save');
                    expect(control.disabled).toBe(false);
                    expect(document.activeElement).toBe(control);
                    expect(output.querySelector('[role="status"]')?.textContent).toBe('Loading');

                    await act(async () => control.click());
                    expect(action).toHaveBeenCalledTimes(1);
                    await act(async () => {
                        release();
                        await pending;
                    });
                    expect(control.hasAttribute('aria-busy')).toBe(false);
                    await act(async () => control.click());
                    expect(action).toHaveBeenCalledTimes(2);
                }
            );
        } finally {
            release();
        }
    }
);

it('retains submitter data and reset behavior through the real form', async () => {
    // The migration must preserve native submit/reset instead of reducing every action to a click-only button.
    const submissions: [string, FormDataEntryValue][][] = [];
    await withMounted(
        <Form
            action={(data) => {
                submissions.push([...data.entries()]);
            }}
        >
            <input name="title" defaultValue="Original" />
            <Button label="Publish" type="submit" name="intent" value="publish" />
            <Button label="Reset" type="reset" />
        </Form>,
        async (output) => {
            const buttons = output.querySelectorAll<HTMLButtonElement>('button');
            const input = output.querySelector<HTMLInputElement>('input');

            if (!input || !buttons[0] || !buttons[1]) throw new Error('Expected form controls');
            input.value = 'Changed';
            await act(async () => buttons[0]?.click());
            expect(submissions).toEqual([
                [
                    ['title', 'Changed'],
                    ['intent', 'publish'],
                ],
            ]);
            input.value = 'Changed again';
            await act(async () => buttons[1]?.click());
            expect(input.value).toBe('Original');
        }
    );
});

it('keeps grouped actions sized and disabled, excluding disabled submitter data', async () => {
    // Group state must retain authority over its action descendants.
    const action = vi.fn();
    const submitted = vi.fn();
    const ancestor = vi.fn();
    await withMounted(
        <section onClick={ancestor}>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    submitted();
                }}
            >
                <ButtonGroup label="Actions" size="lg" isDisabled>
                    <Button label="Publish" type="submit" name="intent" value="publish" onClick={action} />
                    <IconButton label="Delete" icon="trash" onClick={action} />
                </ButtonGroup>
            </form>
        </section>,
        async (output) => {
            const controls = output.querySelectorAll<HTMLButtonElement>('button');
            const form = output.querySelector('form');

            if (!form) throw new Error('Expected the form');
            await act(async () => {
                for (const control of controls) control.click();
            });
            expect(action).not.toHaveBeenCalled();
            expect(submitted).not.toHaveBeenCalled();
            expect(ancestor).not.toHaveBeenCalled();
            expect(new FormData(form).has('intent')).toBe(false);
            expect(Array.from(controls, (control) => control.dataset.size)).toEqual(['lg', 'lg']);
            expect(Array.from(controls, (control) => control.getAttribute('aria-disabled'))).toEqual(['true', 'true']);
        }
    );
});

it('lets actions cancel scoped navigation before it reaches the host', async () => {
    // The onClick contract permits validation or a confirmation to cancel a destination.
    const navigate = vi.fn();
    await withMounted(
        <LinkNavigationContext value={{ baseUrl: 'https://example.com/', navigate }}>
            <Button label="Blocked" href="/orders" onClick={(event) => event.preventDefault()} />
            <Button label="Open" href="/orders" />
        </LinkNavigationContext>,
        async (output) => {
            const controls = output.querySelectorAll<HTMLButtonElement>('button');

            await act(async () => controls[0]?.click());
            expect(navigate).not.toHaveBeenCalled();
            await act(async () => controls[1]?.click());
            expect(navigate).toHaveBeenCalledExactlyOnceWith('/orders');
            expect(output.querySelector('a')).toBeNull();
        }
    );
});

it('keeps a native link outside the scoped host and honors click cancellation', async () => {
    // Native previews retain link semantics; a disabled destination must not remain navigable.
    const prevented: boolean[] = [];
    await withMounted(
        <>
            <Button label="Docs" href="https://example.com/docs" onClick={(event) => event.preventDefault()} />
            <Button label="Disabled" href="https://example.com/disabled" disabled />
        </>,
        async (output) => {
            const anchor = output.querySelector('a');

            if (!anchor) throw new Error('Expected native link semantics');
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            await act(async () => {
                anchor.dispatchEvent(event);
                prevented.push(event.defaultPrevented);
            });
            expect(anchor.getAttribute('href')).toBe('https://example.com/docs');
            expect(prevented).toEqual([true]);
            expect(output.querySelector('button')?.getAttribute('aria-disabled')).toBe('true');
            expect(output.querySelectorAll('a')).toHaveLength(1);
        }
    );
});

it('recovers from an already reported request failure without replacing the View', async () => {
    // Reported failures already have user-facing feedback and must leave a retryable action mounted.
    const action = vi.fn(async () => {
        throw new ReportedError('Already reported');
    });

    await withMounted(
        <ErrorBoundary fallback={<p role="alert">View failed</p>}>
            <Button label="Retry" onClick={action} />
        </ErrorBoundary>,
        async (output) => {
            const control = output.querySelector('button');

            if (!control) throw new Error('Expected retry control');
            await act(async () => control.click());
            expect(output.querySelector('[role="alert"]')).toBeNull();
            expect(control.hasAttribute('aria-busy')).toBe(false);
            await act(async () => control.click());
            expect(action).toHaveBeenCalledTimes(2);
        }
    );
});

it('still exposes unexpected action failures to the View error boundary', async () => {
    // Migration must not silently swallow a failure that no notification owner has handled.
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
        await withMounted(
            <ErrorBoundary fallback={<p role="alert">View failed</p>}>
                <Button
                    label="Run"
                    onClick={async () => {
                        throw new Error('Unexpected');
                    }}
                />
            </ErrorBoundary>,
            async (output) => {
                await act(async () => output.querySelector('button')?.click());
                expect(output.querySelector('[role="alert"]')?.textContent).toBe('View failed');
            }
        );
    } finally {
        logged.mockRestore();
    }
});
