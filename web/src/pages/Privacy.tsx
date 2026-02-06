import { Link } from 'react-router';

import { Card, CardContent } from '@/components/ui/card';

export default function Privacy() {
    return (
        <div className="flex min-h-screen items-center justify-center px-6 py-12 text-white">
            <Card className="w-full max-w-2xl border-white/10 bg-white/5">
                <CardContent className="space-y-6 p-8">
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                            Privacy
                        </p>
                        <h1 className="text-3xl font-semibold">
                            Privacy policy
                        </h1>
                        <p className="text-sm text-white/70">
                            LongLink SAGL protects your personal data and keeps
                            it secure. This page outlines how we handle account
                            details, usage analytics, and security logs for the
                            ViaVai platform.
                        </p>
                    </div>
                    <div className="space-y-3 text-sm text-white/70">
                        <p>
                            We only collect information needed to operate the
                            platform, provide support, and improve product
                            performance. We never sell personal data.
                        </p>
                        <p>
                            For any questions or requests, contact us at{' '}
                            <span className="text-white">
                                privacy@longlink.com
                            </span>
                            .
                        </p>
                    </div>
                    <Link
                        to="/"
                        className="text-sm text-blue-300 hover:underline"
                    >
                        Back to home
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
