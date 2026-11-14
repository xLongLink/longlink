// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, createRef } from 'react';
import { withMounted } from '../render';
import { Form } from '@/components/custom/form';
import userEvent from '@testing-library/user-event';
import { TextInput } from '@/components/custom/text-input';

it('prevents submission when the caller disables the final mutation', async () => {
    // Arrange
    const submissions: FormData[] = [];

    // Act
    await withMounted(
        <Form
            action={(data) => {
                submissions.push(data);
            }}
            submitDisabled
        >
            <TextInput label="Name" name="name" defaultValue="Acme" />
        </Form>,
        async (output) => {
            // Require a submission target so missing markup cannot pass silently.
            const form = output.querySelector('form');

            if (!form) throw new Error('Expected Form to render a form element');

            await act(async () => {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            });

            // Assert
            expect(submissions).toEqual([]);
        }
    );
});

it('lets a native submit handler cancel a write and preserves submitter data when allowed', async () => {
    const submissions: FormData[] = [];
    const ref = createRef<HTMLFormElement>();
    let canceled = true;

    await withMounted(
        <>
            <Form
                ref={ref}
                id="order"
                className="w-full"
                style={{ maxWidth: 640 }}
                aria-label="Order"
                onSubmit={(event) => {
                    if (canceled) event.preventDefault();
                }}
                action={(data) => {
                    submissions.push(data);
                }}
            >
                <input name="name" defaultValue="Acme" />
            </Form>
            <button form="order" type="submit" name="decision" value="save">
                Save
            </button>
        </>,
        async (output) => {
            const form = output.querySelector('form');
            const button = output.querySelector('button');

            if (!form || !button) throw new Error('Expected the order form and external submit button');

            expect(ref.current).toBe(form);
            expect(button.form).toBe(form);
            expect(form.className).toBe('w-full');
            expect(form.style.maxWidth).toBe('640px');
            expect(form.getAttribute('aria-label')).toBe('Order');

            await act(async () => {
                form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: button }));
            });
            expect(submissions).toHaveLength(0);

            canceled = false;
            await act(async () => {
                form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: button }));
            });
            expect(submissions).toHaveLength(1);
            expect([...submissions[0].entries()]).toEqual([
                ['name', 'Acme'],
                ['decision', 'save']
            ]);
        }
    );
});

it('honors a canceled native reset without losing edited custom field values', async () => {
    const user = userEvent.setup();
    const submissions: FormData[] = [];
    let canceled = true;

    await withMounted(
        <Form
            onReset={(event) => {
                if (canceled) event.preventDefault();
            }}
            action={(data) => {
                submissions.push(data);
            }}
        >
            <TextInput label="Name" name="name" defaultValue="Original" />
        </Form>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector<HTMLInputElement>('input[name="name"]');

            if (!form || !input) throw new Error('Expected the editable name form');

            await act(async () => user.clear(input));
            await act(async () => user.type(input, 'Edited'));
            await act(async () => form.reset());
            await act(async () => {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            });
            expect(submissions[0]?.get('name')).toBe('Edited');

            canceled = false;
            await act(async () => form.reset());
            await act(async () => {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            });
            expect(submissions[1]?.get('name')).toBe('Original');
        }
    );
});

it('validates externally associated controls without blocking on another form or disabled fields', async () => {
    const user = userEvent.setup();
    const submissions: FormData[] = [];

    await withMounted(
        <>
            <Form
                id="customer"
                action={(data) => {
                    submissions.push(data);
                }}
            >
                <input name="name" defaultValue="Acme" required />
            </Form>
            <input form="customer" name="email" type="email" defaultValue="invalid" required />
            <input form="customer" name="disabled" required disabled />
            <form id="unrelated">
                <input name="foreign" required />
            </form>
        </>,
        async (output) => {
            const form = output.querySelector('form');
            const email = output.querySelector<HTMLInputElement>('input[name="email"]');

            if (!form || !email) throw new Error('Expected the customer form and external email field');

            await act(async () => {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            });
            expect(submissions).toHaveLength(0);
            expect(document.activeElement).toBe(email);

            await act(async () => user.clear(email));
            await act(async () => user.type(email, 'customer@example.com'));
            await act(async () => {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            });
            expect(submissions).toHaveLength(1);
            expect([...submissions[0].entries()]).toEqual([
                ['name', 'Acme'],
                ['email', 'customer@example.com']
            ]);
        }
    );
});
