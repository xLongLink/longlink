import { buttonVariants } from '@/ui/button';
import { Card, CardContent } from '@/ui/card';
import { Layers } from 'lucide-react';
import { Link } from 'react-router';

/**
 * Renders the home landing page.
 */
export default function Index() {
    return (
        <div className="flex min-h-screen items-center justify-center px-6 py-12 text-white">
            <Card className="w-full max-w-lg border-white/10 bg-white/5">
                <CardContent className="space-y-6 p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
                        <Layers className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">LongLink</p>
                        <h1 className="text-2xl font-semibold">Welcome</h1>
                        <p className="text-sm text-white/60">Select an organization or application to continue.</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Link to="/" className={buttonVariants()}>
                            Enter app
                        </Link>
                        <Link to="/" className={buttonVariants({ variant: 'outline' })}>
                            View dashboard
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
