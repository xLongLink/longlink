import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';

/** Renders the placeholder pricing page. */
export default function Pricing() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="min-h-[calc(100vh-9rem)]" />
            <Footer />
        </div>
    );
}
