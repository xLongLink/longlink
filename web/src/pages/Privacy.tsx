import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';

/** Renders the public privacy page. */
export default function Privacy() {
    return (
        <main className="mx-auto w-full max-w-[1000px] px-6 py-16">
            <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader>
                    <CardTitle className="text-3xl text-white">Privacy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-8 text-sm leading-6 text-white/70">
                    <p>
                        LongLink processes account, organization, and usage data to provide access control, routing, and
                        auditability.
                    </p>
                    <p>
                        Only the data required to run the platform should be collected and retained according to the
                        operator&apos;s policy.
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
