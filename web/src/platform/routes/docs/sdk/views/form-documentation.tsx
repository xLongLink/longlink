import ViewLayout from './view-layout';
import type { ReactNode } from 'react';
import FormPreview from './form-preview';

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
    return <ViewLayout name={name} example={{ title: name, preview: <FormPreview>{preview}</FormPreview>, code }} />;
}
