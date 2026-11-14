import { z } from 'zod';
import type { ReactNode } from 'react';

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
        <div className="flex min-h-[calc(100dvh-var(--\_app-shell-header-height,0px)-var(--spacing-4))] w-full items-center justify-center">
            <div
                className="box-border flex w-full max-w-96 flex-col gap-4 px-4 py-8 data-[description=none]:gap-2"
                data-description={description === null ? 'none' : undefined}
            >
                <div className="flex flex-col gap-1">
                    <h1 className="m-0 text-center font-(family-name:--font-family-heading) text-[length:var(--text-heading-1-size)] leading-(--text-heading-1-leading) font-(--text-heading-1-weight) wrap-anywhere text-foreground">
                        {title}
                    </h1>
                    {descriptionText.success ? (
                        <p className="m-0 text-center font-sans text-[length:var(--text-supporting-size)] leading-(--text-supporting-leading) font-(--text-supporting-weight) wrap-anywhere text-muted-foreground">
                            {descriptionText.data}
                        </p>
                    ) : (
                        description
                    )}
                </div>
                {children}
            </div>
        </div>
    );
}
