import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Heading } from '@/components/ui/heading';

/** Renders the public impressum page. */
export default function Impressum() {
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
                            Impressum
                        </Heading>
                        <div className="space-y-1 text-sm text-muted-foreground print:text-black">
                            <div>Last update: May 20, 2026</div>
                            <div>TODO: complete this</div>
                        </div>
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
