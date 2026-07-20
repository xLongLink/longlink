import type { ReactNode } from 'react';
import Layout from '@/layout/Layout';

/** Renders the shared shell for standalone account authentication pages. */
export function AuthPage({
    children,
    description,
    title,
}: {
    children: ReactNode;
    description: string;
    title: string;
}) {
    return (
        <Layout brandOnly brandHref="/">
            <section className="mx-auto flex w-full max-w-[1000px] flex-1 items-center justify-center py-12">
                <div className="w-full max-w-sm space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl font-medium text-foreground">{title}</h1>
                        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
                    </div>
                    {children}
                </div>
            </section>
        </Layout>
    );
}
