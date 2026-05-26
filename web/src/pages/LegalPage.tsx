import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import MarkdownDoc from '@/docs/MarkdownDoc';
import { Heading } from '@/components/ui/heading';

type LegalPageProps = {
    title: string;
    content: string;
};

/** Renders the shared public legal page shell. */
export function LegalPage({ title, content }: LegalPageProps) {
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
                        <MarkdownDoc content={content} />
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
