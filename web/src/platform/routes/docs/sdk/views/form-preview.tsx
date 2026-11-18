import type { ReactNode } from 'react';
import { Box } from '@/components/longlink/layout/box';
import { FieldGroup } from '@/components/shadcn/field';

/** Keeps field previews editable without sending API requests. */
export default function FormPreview({ children }: { children: ReactNode }) {
    return (
        <Box width="80%">
            <form onSubmit={(event) => event.preventDefault()}>
                <FieldGroup>{children}</FieldGroup>
            </form>
        </Box>
    );
}
