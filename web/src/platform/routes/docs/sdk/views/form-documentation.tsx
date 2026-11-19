import ViewLayout from './view-layout';
import type { ReactNode } from 'react';
import { Box } from '@/components/longlink';
import { FieldGroup } from '@/components/shadcn/field';

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
    return (
        <ViewLayout
            name={name}
            example={{
                title: name,
                preview: (
                    <Box width="80%">
                        <form onSubmit={(event) => event.preventDefault()}>
                            <FieldGroup>{preview}</FieldGroup>
                        </form>
                    </Box>
                ),
                code
            }}
        />
    );
}
