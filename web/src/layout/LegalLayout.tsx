import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { A } from '@/components/ui/a';
import { Heading } from '@/components/ui/heading';
import { formatDate } from '@/lib/utils';
import { type ReactNode } from 'react';

type LegalMetadata = {
    lastUpdated: string;
    editUrl: string;
};

type LegalLayoutProps = {
    title: string;
    content: ReactNode;
    metadata?: LegalMetadata;
};

/** Renders the shared public legal layout. */
export function LegalLayout({ title, content, metadata }: LegalLayoutProps) {
    const lastUpdated = metadata?.lastUpdated
        ? (() => {
              const parsedDate = new Date(metadata.lastUpdated);

              return Number.isNaN(parsedDate.getTime()) ? metadata.lastUpdated : formatDate(parsedDate);
          })()
        : '';

    return (
        <div className="flex min-h-screen flex-col text-foreground">
            <div className="print:hidden">
                <div className="mx-auto w-full max-w-[1000px]">
                    <Navbar />
                </div>
            </div>
            <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-16 print:mx-0 print:max-w-none print:px-0 print:py-0">
                <section className="relative overflow-hidden rounded-2xl border border-border bg-card/80 shadow-lg shadow-black/10 ring-1 ring-border/60 print:overflow-visible print:border-0 print:bg-transparent print:shadow-none print:ring-0">
                    <div className="space-y-6 p-6 pt-2 text-sm leading-6 text-muted-foreground print:p-0 print:text-black">
                        <Heading level="h1" className="text-3xl text-foreground print:text-black">
                            {title}
                        </Heading>
                        <article className="mx-auto w-full max-w-2xl space-y-6">{content}</article>
                        {metadata?.lastUpdated || metadata?.editUrl ? (
                            <footer className="mt-8 flex flex-col gap-1 border-t border-border pt-4 text-xs font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                                {metadata.lastUpdated ? <span>Last updated: {lastUpdated}</span> : <span />}
                                {metadata.editUrl ? (
                                    <A href={metadata.editUrl} target="_blank" rel="noopener noreferrer">
                                        Edit this page in GitHub
                                    </A>
                                ) : null}
                            </footer>
                        ) : null}
                    </div>
                </section>
            </main>
            <div className="print:hidden">
                <div className="mx-auto w-full max-w-[1000px]">
                    <Footer />
                </div>
            </div>
        </div>
    );
}
