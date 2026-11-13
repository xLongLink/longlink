import { it, expect } from 'vitest';
// @vitest-environment happy-dom
import { act, useRef, useState } from 'react';
import { Form } from '@/components/custom/form';
import { renderStatic, withMounted } from '../../render';
import { FormField } from '@/components/custom/form-field';

it('serializes each authored string once and excludes disabled carriers', () => {
    // Arrange
    function Probe() {
        const ref = useRef<HTMLElement>(null);

        return (
            <FormField label="Tags" name="tags" fieldRef={ref} values={['red', 'blue']} serialize disabled>
                Tags
            </FormField>
        );
    }

    // Act
    const output = renderStatic(<Probe />);

    // Assert
    expect([...output.querySelectorAll('input[name="tags"]')].map((input) => input.getAttribute('value'))).toEqual([
        'red',
        'blue'
    ]);
    expect([...output.querySelectorAll('input')].every((input) => input.disabled)).toBe(true);
});

it('retains custom-field validation and canceled reset feedback through the native root', async () => {
    const submitted: FormData[] = [];

    function Probe() {
        const field = useRef<HTMLElement>(null);
        const [values, setValues] = useState<string[]>([]);

        return (
            <Form
                action={(data) => {
                    submitted.push(data);
                }}
            >
                <FormField label="Tags" name="tags" required fieldRef={field} values={values} serialize>
                    <button type="button" onClick={() => setValues(['red', 'blue'])}>
                        Choose tags
                    </button>
                </FormField>
            </Form>
        );
    }

    await withMounted(<Probe />, async (output) => {
        const form = output.querySelector('form');
        const choose = output.querySelector('button');

        if (!form || !choose) throw new Error('Expected the tags form');

        await act(async () => {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        expect(submitted).toHaveLength(0);
        expect(output.querySelector('[role="alert"]')?.textContent).toBe('Please complete this field.');
        expect(document.activeElement).toBe(choose);

        const cancelReset = (event: Event) => event.preventDefault();
        form.addEventListener('reset', cancelReset);
        await act(async () => form.reset());
        expect(output.querySelector('[role="alert"]')).not.toBeNull();

        form.removeEventListener('reset', cancelReset);
        await act(async () => form.reset());
        expect(output.querySelector('[role="alert"]')).toBeNull();

        await act(async () => choose.click());
        await act(async () => {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        expect(submitted).toHaveLength(1);
        expect(submitted[0]?.getAll('tags')).toEqual(['red', 'blue']);
    });
});

it('collects the latest attachment once and excludes fields disabled by their ancestor', async () => {
    // Arrange a retained collector whose file changes without reconnecting the listener.
    const initial = new File(['initial'], 'initial.txt');
    const replacement = new File(['replacement'], 'replacement.txt');

    function Probe() {
        const field = useRef<HTMLElement>(null);
        const disabled = useRef<HTMLElement>(null);
        const [file, setFile] = useState(initial);

        return (
            <form>
                <FormField label="Attachment" name="attachment" fieldRef={field} values={['reference', file]} serialize>
                    <button type="button" onClick={() => setFile(replacement)}>
                        Replace attachment
                    </button>
                </FormField>
                <fieldset disabled>
                    <FormField label="Disabled" name="disabled" fieldRef={disabled} values={[file]} serialize>
                        Disabled attachment
                    </FormField>
                </fieldset>
            </form>
        );
    }

    await withMounted(<Probe />, async (output) => {
        const form = output.querySelector('form');
        const replace = output.querySelector('button');

        if (!form || !replace) throw new Error('Expected the attachment form');

        await act(async () => replace.click());

        // Happy DOM lacks FormDataEvent and does not emit formdata when constructing FormData.
        const data = new FormData(form);
        form.dispatchEvent(Object.assign(new Event('formdata'), { formData: data }));

        const attachments = data.getAll('attachment');
        const attachment = attachments[1];

        expect(attachments).toHaveLength(2);
        expect(attachments[0]).toBe('reference');

        if (!(attachment instanceof File)) throw new Error('Expected the submitted attachment');

        expect(attachment.name).toBe('replacement.txt');
        expect(await attachment.text()).toBe('replacement');
        expect(data.has('disabled')).toBe(false);
    });
});
