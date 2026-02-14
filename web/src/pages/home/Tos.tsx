import { Link } from 'react-router';

import { Card, CardContent } from '@/components/ui/card';

export default function Tos() {
    return (
        <div className="flex min-h-screen items-center justify-center px-6 py-12 text-white">
            <Card className="w-full max-w-2xl border-white/10 bg-white/5">
                <CardContent className="space-y-6 p-8">
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                            Terms &amp; Conditions
                        </p>
                        <h1 className="text-3xl font-semibold">
                            Terms of service
                        </h1>
                        <p className="text-sm text-white/70">
                            These terms govern your use of LongLink and ViaVai.
                            By accessing the platform, you agree to comply with
                            organization policies, app licensing, and data
                            governance requirements.
                        </p>
                    </div>
                    <div className="space-y-3 text-sm text-white/70">
                        <p>
                            You are responsible for maintaining the
                            confidentiality of your account and for all
                            activities that occur under your credentials.
                        </p>
                        <p>
                            If you need a copy of the full agreement, please
                            contact{' '}
                            <span className="text-white">
                                legal@longlink.com
                            </span>
                            .
                        </p>
                    </div>
                    <Link
                        to="/home"
                        className="text-sm text-blue-300 hover:underline"
                    >
                        Back to home
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
