import { z } from 'zod';
import type { ReactNode } from 'react';
import '@/platform/layouts/auth.css';

/** Renders the shared standalone account page frame. */
export function AuthLayout({
    children,
    description,
    title
}: {
    children: ReactNode;
    description: ReactNode;
    title: ReactNode;
}) {
    // Only plain text needs typography; authored elements keep their own presentation.
    const descriptionText = z.string().safeParse(description);

    return (
        <div className="native-auth-center">
            <div className="native-auth-body" data-description={description === null ? 'none' : undefined}>
                <div className="native-auth-heading">
                    <h1>{title}</h1>
                    {descriptionText.success ? (
                        <p className="native-auth-description">{descriptionText.data}</p>
                    ) : (
                        description
                    )}
                </div>
                {children}
            </div>
        </div>
    );
}
