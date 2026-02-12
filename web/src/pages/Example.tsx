import { Form } from '@/components/viavai/Form';
import { type Component } from '@/types/viavai/form.types';

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

export default function Example() {
    return <Form schema={sample} />;
}
