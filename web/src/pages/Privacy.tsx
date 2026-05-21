import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { downloadLegalPdf } from '@/lib/legal-pdf';
import { Download } from 'lucide-react';

/** Renders the public privacy page. */
export default function Privacy() {
    return (
        <div className="flex min-h-screen flex-col text-foreground">
            <div className="print:hidden">
                <div className="mx-auto w-full max-w-[1000px]">
                    <Navbar />
                </div>
            </div>
            <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-16 print:mx-0 print:max-w-none print:px-0 print:py-0">
                <section className="relative overflow-hidden rounded-2xl border border-border bg-card/80 shadow-lg shadow-black/10 ring-1 ring-border/60 print:overflow-visible print:border-0 print:bg-transparent print:shadow-none print:ring-0">
                    <div className="flex items-center gap-2 px-4 pt-2 print:hidden">
                        <span className="h-3 w-3 rounded-full bg-red-400" />
                        <span className="h-3 w-3 rounded-full bg-yellow-400" />
                        <span className="h-3 w-3 rounded-full bg-green-400" />
                        <div className="ml-auto">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="cursor-pointer"
                                onClick={() =>
                                    downloadLegalPdf('privacy.pdf', 'Privacy', [
                                        'LongLink processes account, organization, and usage data to provide access control, routing, and auditability.',
                                        "Only the data required to run the platform should be collected and retained according to the operator's policy.",
                                    ])
                                }
                                aria-label="Download Privacy as PDF"
                            >
                                <Download />
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-6 p-6 pt-2 text-sm leading-6 text-muted-foreground print:p-0 print:text-black">
                        <Heading level="h1" className="text-3xl text-foreground print:text-black">
                            Privacy
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
