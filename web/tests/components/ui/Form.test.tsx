// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../render';
import { Form } from '@/components/ui/Form';
import { TextInput } from '@/components/ui/TextInput';
import { FormRequestContext } from '@/components/ui/contexts';

it.each([undefined, 'post', 'put', 'patch', 'delete'] as const)(
    'submits named fields using method %s',
    async (method) => {
        // Arrange
        const submissions: [string, string, [string, string | Blob][]][] = [];

        // Act
        await withMounted(
            <FormRequestContext
                value={async (path, options) => {
                    submissions.push([path, options.method, options.form]);

                    return null;
                }}
            >
                <Form action="/api/orders" method={method}>
                    <TextInput label="Name" name="name" defaultValue="Acme" />
                </Form>
            </FormRequestContext>,
            async (output) => {
                await act(async () => {
                    output
                        .querySelector('form')
                        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                });

                // Assert
                expect(submissions).toEqual([['/api/orders', (method ?? 'post').toUpperCase(), [['name', 'Acme']]]]);
            }
        );
    }
);
