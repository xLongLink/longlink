import type { ReactNode } from 'react';
import { Form } from '@/components/custom/form';

/** Keeps field previews editable without sending API requests. */
export default function FormPreview({ children }: { children: ReactNode }) {
    return (
        <div className="w-4/5 min-w-0">
            <Form action={() => undefined}>{children}</Form>
        </div>
    );
}
