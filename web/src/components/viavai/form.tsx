import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup } from '@/components/ui/field';

/* ============================================================
   Types
============================================================ */

import {
    type Component,
    type FieldDefinition,
} from '@/types/viavai/form.types';

/* ============================================================
   JSON Form Configuration
============================================================ */

const sample: Component[] = [
    {
        type: 'text',
        name: 'title',
        label: 'Bug Title',
        description: 'Short summary of the issue.',
        placeholder: 'Login button not working',
        required: true,
        default: '',
        validate: {
            minLength: 5,
            maxLength: 32,
        },
        error: 'Title must be between 5 and 32 characters.',
    },
    {
        type: 'textarea',
        name: 'description',
        label: 'Description',
        description: 'Steps to reproduce and expected result.',
        placeholder: 'Explain what happened...',
        required: true,
        default: '',
        validate: {
            minLength: 20,
            maxLength: 100,
        },
        error: 'Description must be between 20 and 100 characters.',
    },
];

/* ============================================================
   Registry
============================================================ */

import { textField } from '@/components/fields/Text';
import { emailField } from '@/components/fields/Email';
import { textareaField } from '@/components/fields/TextArea';

const fieldRegistry: Record<string, FieldDefinition> = {
    text: textField,
    email: emailField,
    textarea: textareaField,
};

/* ============================================================
   Schema Builder
============================================================ */

function buildSchema(components: Component[]) {
    const shape: Record<string, z.ZodTypeAny> = {};

    components.forEach((config) => {
        const definition = fieldRegistry[config.type];
        if (!definition) return;

        shape[config.name] = definition.validation(config);
    });

    return z.object(shape);
}

/* ============================================================
   Component
============================================================ */

export function Form() {
    const schema = buildSchema(sample);

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: Object.fromEntries(
            sample.map((f) => [f.name, f.default ?? ''])
        ),
    });

    function onSubmit(data: any) {
        toast('Submitted values:', {
            description: (
                <pre className="bg-code text-code-foreground mt-2 w-[320px] overflow-x-auto rounded-md p-4">
                    <code>{JSON.stringify(data, null, 2)}</code>
                </pre>
            ),
        });
    }

    return (
        <Card className="w-full sm:max-w-md">
            <CardHeader>
                <CardTitle>Dynamic Form</CardTitle>
                <CardDescription>
                    Registry-driven scalable architecture
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form id="dynamic-form" onSubmit={form.handleSubmit(onSubmit)}>
                    <FieldGroup>
                        {sample.map((config) => {
                            const definition = fieldRegistry[config.type];
                            if (!definition) return null;

                            return (
                                <div key={config.name}>
                                    {definition.component({
                                        config,
                                        control: form.control,
                                    })}
                                </div>
                            );
                        })}
                    </FieldGroup>
                </form>
            </CardContent>

            <CardFooter>
                <Field orientation="horizontal">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset()}
                    >
                        Reset
                    </Button>
                    <Button type="submit" form="dynamic-form">
                        Submit
                    </Button>
                </Field>
            </CardFooter>
        </Card>
    );
}

export default Form;
