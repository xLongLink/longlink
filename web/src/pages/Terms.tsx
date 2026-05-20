import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { downloadLegalPdf } from '@/lib/legal-pdf';
import { Download } from 'lucide-react';

/** Renders the public terms page. */
export default function Terms() {
    return (
        <div className="page-shell flex min-h-screen flex-col text-white">
            <div className="print:hidden">
                <div className="mx-auto w-full max-w-[1000px]">
                    <Navbar />
                </div>
            </div>
            <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-16 print:mx-0 print:max-w-none print:px-0 print:py-0">
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/20 ring-1 ring-white/5 print:overflow-visible print:border-0 print:bg-transparent print:shadow-none print:ring-0">
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
                                    downloadLegalPdf('terms.pdf', 'Terms', [
                                        'These terms govern access to the LongLink platform, associated apps, and shared runtime services.',
                                        'By using the service, you agree to follow the applicable access controls, security requirements, and usage policies defined by the operator.',
                                    ])
                                }
                                aria-label="Download Terms as PDF"
                            >
                                <Download />
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-6 p-6 pt-2 text-sm leading-6 text-white/70 print:p-0 print:text-black">
                        <Heading level="h1" className="text-3xl text-white print:text-black">
                            Terms
                        </Heading>
                        <div className="space-y-1 text-sm text-white/60 print:text-black">
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
