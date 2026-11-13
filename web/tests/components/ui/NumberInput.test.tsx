// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { createPortal } from 'react-dom';
import { Form } from '@/components/custom/Form';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { NumberInput } from '@/components/custom/NumberInput';

it('does not invent zero for an omitted numeric field', () => {
    // Act
    const output = renderStatic(<NumberInput label="Quantity" name="quantity" />);

    // Assert
    expect(output.querySelector('input[name="quantity"]')?.getAttribute('value')).toBe('');
});

it('keeps negative, decimal, and exponent drafts intact until a complete edit commits', async () => {
    // Partial numeric edits must never be replaced with zero or submit a previous saved number.
    const changes: (number | null)[] = [];
    const submissions: FormData[] = [];
    const user = userEvent.setup();

    await withMounted(
        <Form
            action={(data) => {
                submissions.push(data);
            }}
        >
            <NumberInput label="Amount" name="amount" onChange={(value) => changes.push(value)} />
        </Form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector('input');

            if (!form || !input) throw new Error('Expected the numeric form');
            await act(async () => user.type(input, '-'));
            expect(input.value).toBe('-');
            await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            expect(submissions).toEqual([]);
            await act(async () => user.type(input, '.5e-'));
            expect(input.value).toBe('-.5e-');
            expect(changes).toEqual([]);
            await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            expect(submissions).toEqual([]);
            await act(async () => user.type(input, '2'));
            expect(input.value).toBe('-.5e-2');
            await act(async () => user.tab());
            expect(changes).toEqual([-0.005]);
            expect(input.value).toBe('-0.005');
            await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            expect(submissions.map((data) => data.getAll('amount'))).toEqual([['-0.005']]);
        }
    );
});

it('blocks required empty drafts through FormField and recovers after editing', async () => {
    // Deleting a saved required value must not pass validation using the stale committed value.
    const submissions: FormData[] = [];
    const user = userEvent.setup();

    await withMounted(
        <Form
            action={(data) => {
                submissions.push(data);
            }}
        >
            <NumberInput label="Quantity" name="quantity" defaultValue={4} required />
        </Form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector('input');

            if (!form || !input) throw new Error('Expected the required numeric form');
            expect(input.required).toBe(false);
            await act(async () => user.clear(input));
            await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            expect(submissions).toEqual([]);
            expect(output.querySelector('[role="alert"]')?.textContent).toBe('Please complete this field.');
            await act(async () => user.type(input, '6'));
            await act(async () => user.tab());
            await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            expect(submissions.map((data) => data.get('quantity'))).toEqual(['6']);
            expect(output.querySelector('[role="alert"]')).toBeNull();
        }
    );
});

it('restores defaults and abandons active malformed drafts only after an accepted reset', async () => {
    // A form reset must clear the editing buffer as well as the committed numeric value.
    const changes: (number | null)[] = [];
    const user = userEvent.setup();

    await withMounted(
        <form>
            <NumberInput label="Quantity" name="quantity" defaultValue={3} onChange={(value) => changes.push(value)} />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector('input');

            if (!form || !input) throw new Error('Expected the resettable numeric field');
            await act(async () => user.clear(input));
            await act(async () => user.type(input, '9'));
            await act(async () => user.tab());
            expect(changes).toEqual([9]);
            await act(async () => user.clear(input));
            await act(async () => user.type(input, '1e-'));
            form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
            await act(async () => form.reset());
            expect(input.value).toBe('1e-');
            await act(async () => form.reset());
            expect(input.value).toBe('3');
            expect(new FormData(form).getAll('quantity')).toEqual(['3']);
            expect(changes).toEqual([9]);

            // Reset also drops a draft when the underlying committed number is already the default.
            await act(async () => user.clear(input));
            await act(async () => user.type(input, '-'));
            await act(async () => form.reset());
            expect(input.value).toBe('3');
        }
    );
});

it('reports rejected controlled commits and clear requests without retaining unsaved display values', async () => {
    // A caller can decline a save; blur, Enter, and clear must all return to the caller-owned number.
    const changes: (number | null)[] = [];
    const user = userEvent.setup();

    await withMounted(
        <form>
            <NumberInput label="Quantity" name="quantity" value={7} onChange={(value) => changes.push(value)} />
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector('input');
            const clear = output.querySelector('button');

            if (!form || !input || !clear) throw new Error('Expected the controlled numeric field');
            let submissions = 0;
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                submissions++;
                expect(new FormData(form).get('quantity')).toBe('7');
            });
            await act(async () => user.clear(input));
            await act(async () => user.type(input, '12'));
            await act(async () => user.tab());
            expect(input.value).toBe('7');
            expect(new FormData(form).getAll('quantity')).toEqual(['7']);
            await act(async () => user.clear(input));
            await act(async () => user.type(input, '15'));
            await act(async () => user.keyboard('{Enter}'));
            expect(input.value).toBe('7');
            expect(submissions).toBe(1);
            const submissionsBeforeClear = submissions;
            await act(async () => user.click(clear));
            expect(input.value).toBe('7');
            expect(changes).toEqual([12, 15, null]);
            expect(document.activeElement).toBe(input);
            expect(submissions).toBe(submissionsBeforeClear);
        }
    );
});

it('clears from the keyboard without submission, retains focus, and submits an optional empty value', async () => {
    // The clear affordance is a keyboard-reachable edit action rather than an implicit submit button.
    const submissions: FormData[] = [];
    const changes: (number | null)[] = [];
    const user = userEvent.setup();

    await withMounted(
        <Form
            action={(data) => {
                submissions.push(data);
            }}
        >
            <NumberInput
                label="Weight"
                name="weight"
                defaultValue={2.5}
                units="kg"
                onChange={(value) => changes.push(value)}
            />
        </Form>,
        async (output) => {
            const input = output.querySelector('input');
            const clear = output.querySelector('button');
            const form = output.querySelector('form');

            if (!input || !clear || !form) throw new Error('Expected the clearable numeric field');
            const describedBy = input.getAttribute('aria-describedby');
            expect(output.querySelector(`[id="${describedBy}"]`)?.textContent).toBe('kg');
            await act(async () => user.tab());
            await act(async () => user.tab());
            expect(document.activeElement).toBe(clear);
            await act(async () => user.keyboard('{Enter}'));
            expect(input.value).toBe('');
            expect(changes).toEqual([null]);
            expect(submissions).toEqual([]);
            expect(document.activeElement).toBe(input);
            expect(output.querySelector('button')).toBeNull();
            await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            expect(submissions.map((data) => data.getAll('weight'))).toEqual([['']]);
        }
    );
});

it('clamps committed bounds, rejects fractional integers, and steps on the authored grid without wheel edits', async () => {
    // Constraints must govern committed callbacks and keyboard stepping, not truncate the typing buffer.
    const changes: (number | null)[] = [];
    const submissions: FormData[] = [];
    const user = userEvent.setup();

    await withMounted(
        <Form
            action={(data) => {
                submissions.push(data);
            }}
        >
            <NumberInput
                label="Quantity"
                name="quantity"
                defaultValue={3}
                min={1}
                max={8}
                step={2}
                isIntegerOnly
                onChange={(value) => changes.push(value)}
            />
        </Form>,
        async (output) => {
            const input = output.querySelector('input');
            const form = output.querySelector('form');

            if (!input || !form) throw new Error('Expected the constrained numeric field');
            await act(async () => user.clear(input));
            await act(async () => user.type(input, '99'));
            expect(input.value).toBe('99');
            await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            expect(submissions).toEqual([]);
            await act(async () => user.tab());
            expect(input.value).toBe('8');
            await act(async () => user.clear(input));
            await act(async () => user.type(input, '2.5'));
            await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            expect(submissions).toEqual([]);
            await act(async () => user.tab());
            expect(input.value).toBe('8');
            await act(async () => user.click(input));
            await act(async () => user.keyboard('{ArrowDown}'));
            expect(input.value).toBe('7');
            await act(async () => user.keyboard('{ArrowDown}'));
            expect(input.value).toBe('5');
            await act(async () =>
                input.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }))
            );
            expect(input.value).toBe('5');
            expect(changes).toEqual([8, 7, 5]);
            await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            expect(submissions.map((data) => data.getAll('quantity'))).toEqual([['5']]);
        }
    );
});

it('keeps fractional keyboard steps precise and falls back to unit steps when step is null', async () => {
    // Binary floating-point artifacts and a null increment must not leak into callbacks or submission.
    const changes: (number | null)[] = [];
    const user = userEvent.setup();

    await withMounted(
        <form>
            <NumberInput
                label="Rate"
                name="rate"
                defaultValue={0.2}
                min={0.1}
                step={0.1}
                onChange={(value) => changes.push(value)}
            />
            <NumberInput label="Count" name="count" step={null} />
        </form>,
        async (output) => {
            const rate = output.querySelector<HTMLInputElement>('input[name="rate"]');
            const count = output.querySelector<HTMLInputElement>('input[name="count"]');
            const form = output.querySelector('form');

            if (!rate || !count || !form) throw new Error('Expected both numeric fields');
            await act(async () => user.click(rate));
            await act(async () => user.keyboard('{ArrowUp}'));
            expect(rate.value).toBe('0.3');
            expect(changes).toEqual([0.3]);
            expect(new FormData(form).get('rate')).toBe('0.3');
            await act(async () => user.click(count));
            await act(async () => user.keyboard('{ArrowUp}{ArrowUp}'));
            expect(count.value).toBe('1');
            expect(new FormData(form).get('count')).toBe('1');
        }
    );
});

it.each([
    [1000000000000000, 1000000000000001],
    [1234567890123456, 1234567890123457]
])('increments the safe integer %s by exactly one', async (initial, expected) => {
    // Decimal-place rounding and grid tolerance must not skip representable integer values.
    const changes: (number | null)[] = [];
    const user = userEvent.setup();

    await withMounted(
        <form>
            <NumberInput
                label="Counter"
                name="counter"
                defaultValue={initial}
                isIntegerOnly
                onChange={(value) => changes.push(value)}
            />
        </form>,
        async (output) => {
            const input = output.querySelector('input');
            const form = output.querySelector('form');

            if (!input || !form) throw new Error('Expected the counter field');
            await act(async () => user.click(input));
            await act(async () => user.keyboard('{ArrowUp}'));
            expect(input.value).toBe(String(expected));
            expect(changes).toEqual([expected]);
            expect(new FormData(form).get('counter')).toBe(String(expected));
        }
    );
});

it.each([
    ['en-US', '1,234', 1234],
    ['en-US', '1 234', 1234],
    ['de-DE', '1.234,5', 1234.5],
    ['de-DE', '1,5', 1.5],
    ['de-DE', '1.234', 1234],
    ['de-DE', '1,234', 1.234],
    ['en-IN', '12,34,567.5', 1234567.5],
    ['ar-EG', '١٬٢٣٤٫٥', 1234.5],
    ['ar-EG', '\uFEFF\u061C\u2067١٬٢٣٤٫٥\u2069', 1234.5],
    ['ar-EG', '1.5', 1.5],
    ['ar', '1.5', 1.5],
    ['en-US', '१,२३४.५', 1234.5],
    ['en-US', '\u200E١,٢٣٤.٥\u200F', 1234.5]
] as const)('commits pasted %s number %s using the owning document language', async (language, pasted, expected) => {
    // A separate document exercises locale discovery without changing global language or Intl state.
    const frame = document.createElement('iframe');
    frame.srcdoc = '<!doctype html><html><body></body></html>';
    document.body.append(frame);
    const localized = frame.contentDocument;

    if (!localized) throw new Error('Expected the localized document');
    localized.documentElement.lang = language;
    const user = userEvent.setup({ document: localized });
    const changes: (number | null)[] = [];
    const submissions: FormData[] = [];

    try {
        await withMounted(
            createPortal(
                <Form
                    action={(data) => {
                        submissions.push(data);
                    }}
                >
                    <NumberInput label="Amount" name="amount" onChange={(value) => changes.push(value)} />
                </Form>,
                localized.body
            ),
            async () => {
                const input = localized.querySelector('input');
                const form = localized.querySelector('form');

                if (!input || !form) throw new Error('Expected the localized numeric form');
                await act(async () => user.click(input));
                await act(async () => user.paste(pasted));
                expect(input.value).toBe(pasted);
                expect(changes).toEqual([]);
                await act(async () => user.tab());
                expect(changes).toEqual([expected]);
                expect(input.value).toBe(String(expected));
                await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
                expect(submissions.map((data) => data.get('amount'))).toEqual([String(expected)]);

                // Refocusing a machine-formatted committed decimal must not reinterpret it as grouping.
                await act(async () => user.click(input));
                await act(async () => user.tab());
                expect(input.value).toBe(String(expected));
                expect(changes).toEqual([expected]);
            }
        );
    } finally {
        frame.remove();
    }
});

it('rejects malformed grouping on Enter instead of submitting a guessed number', async () => {
    // Removing every comma would silently turn an invalid pasted amount into a different saved value.
    const changes: (number | null)[] = [];
    const submissions: FormData[] = [];
    const user = userEvent.setup();

    await withMounted(
        <Form
            action={(data) => {
                submissions.push(data);
            }}
        >
            <NumberInput label="Amount" name="amount" defaultValue={9} onChange={(value) => changes.push(value)} />
        </Form>,
        async (output) => {
            const input = output.querySelector('input');

            if (!input) throw new Error('Expected the amount input');
            await act(async () => user.clear(input));
            await act(async () => user.paste('1,23'));
            await act(async () => user.keyboard('{Enter}'));
            expect(submissions).toEqual([]);
            expect(changes).toEqual([]);
            expect(input.value).toBe('1,23');
            await act(async () => user.tab());
            expect(input.value).toBe('9');
            await act(async () => user.clear(input));
            await act(async () => user.paste('1,234'));
            await act(async () => user.keyboard('{Enter}'));
            expect(changes).toEqual([1234]);
            expect(submissions.map((data) => data.get('amount'))).toEqual(['1234']);
        }
    );
});

it('keeps disabled fields discoverable but excludes their values and blocks edits and Enter submission', async () => {
    // Disabled numeric fields follow the incumbent focusable/read-only contract, not native disabling.
    const changes: (number | null)[] = [];
    const user = userEvent.setup();

    await withMounted(
        <form>
            <NumberInput
                label="Locked"
                name="locked"
                defaultValue={4}
                disabled
                required
                onChange={(value) => changes.push(value)}
            />
        </form>,
        async (output) => {
            const input = output.querySelector('input');
            const form = output.querySelector('form');

            if (!input || !form) throw new Error('Expected the disabled numeric field');
            await act(async () => user.tab());
            expect(document.activeElement).toBe(input);
            expect(input.readOnly).toBe(true);
            expect(input.getAttribute('aria-disabled')).toBe('true');
            expect(output.querySelector('button')).toBeNull();
            let submissions = 0;
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                submissions++;
            });
            await act(async () => user.keyboard('9{ArrowUp}'));
            await act(async () => user.keyboard('{Enter}'));
            expect(submissions).toBe(0);
            expect(input.value).toBe('4');
            expect(changes).toEqual([]);
            expect([...new FormData(form)]).toEqual([]);
        }
    );
});
