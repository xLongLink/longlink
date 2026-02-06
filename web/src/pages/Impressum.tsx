import { Link } from 'react-router';

import { Card, CardContent } from '@/components/ui/card';

export default function Impressum() {
    return (
        <div className="flex min-h-screen items-center justify-center px-6 py-12 text-white">
            <Card className="w-full max-w-2xl border-white/10 bg-white/5">
                <CardContent className="space-y-6 p-8">
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                            Impressum
                        </p>
                        <h1 className="text-3xl font-semibold">
                            Company information
                        </h1>
                        <p className="text-sm text-white/70">
                            LongLink SAGL is registered in Switzerland and
                            operates the ViaVai platform. This page provides the
                            required company details and contact information.
                        </p>
                    </div>
                    <div className="space-y-2 text-sm text-white/70">
                        <p>LongLink SAGL</p>
                        <p>Via Industria 21, 6900 Lugano, Switzerland</p>
                        <p>
                            Email:{' '}
                            <span className="text-white">
                                info@longlink.com
                            </span>
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
