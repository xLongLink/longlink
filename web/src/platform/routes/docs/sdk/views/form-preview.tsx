import type { ReactNode } from 'react';
import { FieldGroup } from '@/components/shadcn/field';

/** Keeps field previews editable without sending API requests. */
export default function FormPreview({ children }: { children: ReactNode }) {
    return (
        <div className="w-4/5 min-w-0">
            <form onSubmit={(event) => event.preventDefault()}>
                <FieldGroup>{children}</FieldGroup>
            </form>
        </div>
    );
}
