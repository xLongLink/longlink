import ViewLayout from './view-layout';
import type { ReactNode } from 'react';
import FormPreview from './form-preview';
import catalog from '../../../../../../../sdk/longlink/.static/jsx/components.json';

/** Keeps form previews editable and documents the same API published to Solution authors. */
export default function FormDocumentation({
    name,
    preview,
    code
}: {
    name: 'Input' | 'Textarea' | 'Checkbox' | 'Switch' | 'Select' | 'Combobox' | 'RadioGroup' | 'Slider';
    preview: ReactNode;
    code: string;
}) {
    const component = catalog.components.find((entry) => entry.name === name);

    return (
        <ViewLayout
            name={name}
            properties={component?.properties ?? []}
            example={{ title: name, preview: <FormPreview>{preview}</FormPreview>, code }}
        />
    );
}
