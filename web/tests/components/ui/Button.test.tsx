import { it, expect, vi } from 'vitest';
import { Form } from '@/components/ui/Form';
import { ReportedError } from '@/lib/reported';
import { Button } from '@/components/custom/Button';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from 'react-error-boundary';
import { IconButton } from '@/components/ui/IconButton';
// @vitest-environment happy-dom
import { act, createRef, type MouseEvent } from 'react';
import { renderStatic, withMounted } from '../../render';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import { LinkNavigationContext } from '@/components/ui/contexts';
import { Button as StandardButton } from '@/components/ui/Button';
import { Dialog, DialogTrigger } from '@/components/shadcn/dialog';

it('composes a dialog trigger with native props, merged click handlers, and both refs', async () => {
    const buttonRef = createRef<HTMLButtonElement>();
    const triggerRef = createRef<HTMLButtonElement>();
    const action = vi.fn();
    const trigger = vi.fn();
    const opened = vi.fn();

    await withMounted(
        <Dialog onOpenChange={opened}>
            <DialogTrigger
                ref={triggerRef}
                onClick={trigger}
                render={
                    <StandardButton
                        ref={buttonRef}
                        variant="outline"
                        size="xs"
                        onClick={action}
                        title="Open settings"
                    />
                }
            >
                <strong>Settings</strong>
            </DialogTrigger>
        </Dialog>,
        async (output) => {
            const control = output.querySelector('button');

            if (!control) throw new Error('Expected the dialog trigger');
            expect(buttonRef.current).toBe(control);
            expect(triggerRef.current).toBe(control);
            expect(control.title).toBe('Open settings');
            expect(control.querySelector('strong')?.textContent).toBe('Settings');
            await act(async () => control.click());
            expect(action).toHaveBeenCalledTimes(1);
            expect(trigger).toHaveBeenCalledTimes(1);
            expect(opened.mock.calls[0]?.[0]).toBe(true);
        }
    );
});

it('does not accidentally submit the surrounding form', () => {
    // Act
    const output = renderStatic(<Button>Run action</Button>);

    // Assert
    expect(output.querySelector('button')?.getAttribute('type')).toBe('button');
    expect(output.textContent).toContain('Run action');
});

it('preserves native link keyboard semantics inside a group', async () => {
    const action = vi.fn((event: MouseEvent<HTMLButtonElement>) => event.preventDefault());
    const user = userEvent.setup();

    await withMounted(
        <ButtonGroup label="Navigation">
            <Button href="https://example.com/docs" onClick={action}>
                Docs
            </Button>
        </ButtonGroup>,
        async (output) => {
            const anchor = output.querySelector('a');

            if (!anchor) throw new Error('Expected the grouped link');
            await act(async () => anchor.focus());
            await act(async () => user.keyboard(' '));
            expect(anchor.getAttribute('role')).toBe('link');
            expect(action).not.toHaveBeenCalled();
            await act(async () => user.keyboard('{Enter}'));
            expect(action).toHaveBeenCalledTimes(1);
        }
    );
});

it.each(['submit', 'reset'] as const)('does not expose a disabled native %s action before hydration', (type) => {
    // Aria-disabled controls have no event guard in server HTML, so their native form action must be withheld.
    const output = renderStatic(
        <Button type={type} name="intent" value="publish" disabled>
            Unavailable
        </Button>
    );

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
                    <Button onClick={action}>Save</Button>
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
            <Button type="submit" name="intent" value="publish">
                Publish
            </Button>
            <Button type="reset">Reset</Button>
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
                    ['intent', 'publish']
                ]
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
                    <Button type="submit" name="intent" value="publish" onClick={action}>
                        Publish
                    </Button>
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
            expect(Array.from(controls, (control) => control.dataset.size)).toEqual(['lg', 'icon-lg']);
            expect(Array.from(controls, (control) => control.getAttribute('aria-disabled'))).toEqual(['true', 'true']);
        }
    );
});

it('lets actions cancel scoped navigation before it reaches the host', async () => {
    // The onClick contract permits validation or a confirmation to cancel a destination.
    const navigate = vi.fn();
    await withMounted(
        <LinkNavigationContext value={{ baseUrl: 'https://example.com/', navigate }}>
            <Button href="/orders" onClick={(event) => event.preventDefault()}>
                Blocked
            </Button>
            <Button href="/orders">Open</Button>
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
            <Button href="https://example.com/docs" onClick={(event) => event.preventDefault()}>
                Docs
            </Button>
            <Button href="https://example.com/disabled" disabled>
                Disabled
            </Button>
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

it.each([new ReportedError('Already reported'), new DOMException('Canceled', 'AbortError')])(
    'recovers from a reported or canceled request without replacing the View: %s',
    async (failure) => {
        // Reported failures already have user-facing feedback and must leave a retryable action mounted.
        const action = vi.fn(async () => {
            throw failure;
        });

        await withMounted(
            <ErrorBoundary fallback={<p role="alert">View failed</p>}>
                <Button onClick={action}>Retry</Button>
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
    }
);

it('still exposes unexpected action failures to the View error boundary', async () => {
    // Migration must not silently swallow a failure that no notification owner has handled.
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
        await withMounted(
            <ErrorBoundary fallback={<p role="alert">View failed</p>}>
                <Button
                    onClick={async () => {
                        throw new Error('Unexpected');
                    }}
                >
                    Run
                </Button>
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
