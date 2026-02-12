import * as z from 'zod';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, FieldGroup } from '@/components/ui/field';
import {
    type Component,
    type FieldDefinition,
} from '@/types/viavai/form.types';

// Registry
import { textField } from '@/components/fields/Text';
import { emailField } from '@/components/fields/Email';
import { textareaField } from '@/components/fields/TextArea';

const fieldRegistry: Record<string, FieldDefinition> = {
    text: textField,
    email: emailField,
    textarea: textareaField,
};

// Schema Builder
function buildSchema(components: Component[]) {
    const shape: Record<string, z.ZodTypeAny> = {};

    components.forEach((config) => {
        const definition = fieldRegistry[config.type];
        if (!definition) return;

        shape[config.name] = definition.validation(config);
    });

    return z.object(shape);
}

// Component
type FormProps = {
    schema: Component[];
};

export function Form({ schema: components }: FormProps) {
    const schema = buildSchema(components);

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: Object.fromEntries(
            components.map((f) => [f.name, f.default ?? ''])
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
        <form
            className="w-full space-y-4 sm:max-w-md"
            onSubmit={form.handleSubmit(onSubmit)}
        >
            <FieldGroup>
                {components.map((config) => {
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

            <div>
                <Field orientation="horizontal">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset()}
                    >
                        Reset
                    </Button>
                    <Button type="submit">Submit</Button>
                </Field>
            </div>
        </form>
    );
}

export default Form;
