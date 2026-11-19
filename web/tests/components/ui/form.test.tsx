// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { useForm } from 'react-hook-form';
import { withMounted } from '../../render';
import { RequestContext } from '@/views/contexts';
import { useSubmit } from '@/lib/hooks/use-submit';

it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
    'submits %s through the scoped bridge without flattening repeated names, uploads, or submitter values',
    async (method) => {
        const file = new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' });
        const submissions: [string, string, [string, string | Blob][]][] = [];
        let completed = false;

        function Example() {
            const form = useForm();

            const submit = useSubmit('/api/orders', {
                method,
                onSuccess: () => {
                    completed = true;
                }
            });

            return (
                <form
                    onSubmit={(event) => {
                        const data = new FormData(event.currentTarget, event.nativeEvent.submitter);
                        data.append('attachment', file);
                        void form.handleSubmit(async () => {
                            await submit(data);
                        })(event);
                    }}
                >
                    <input name="tag" defaultValue="red" />
                    <input name="tag" defaultValue="blue" />
                    <input name="excluded" defaultValue="private" disabled />
                    <button type="submit" name="decision" value="save">
                        Save
                    </button>
                </form>
            );
        }

        await withMounted(
            <RequestContext
                value={{
                    request: async (path, options) => {
                        if (!options?.form || !options.method) throw new Error('Expected a write request');
                        submissions.push([path, options.method, options.form]);
                        expect(completed).toBe(false);

                        return null;
                    },
                    download: async () => {}
                }}
            >
                <Example />
            </RequestContext>,
            async (output) => {
                const button = output.querySelector('button');

                if (!button) throw new Error('Expected the submit button');
                await act(async () => button.click());
                expect(submissions).toEqual([
                    [
                        '/api/orders',
                        method,
                        [
                            ['tag', 'red'],
                            ['tag', 'blue'],
                            ['decision', 'save'],
                            ['attachment', file]
                        ]
                    ]
                ]);
                expect(completed).toBe(true);
            }
        );
    }
);
