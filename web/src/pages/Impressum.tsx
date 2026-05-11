import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';

/** Renders the public impressum page. */
export default function Impressum() {
    return (
        <main className="mx-auto w-full max-w-[1000px] px-6 py-16">
            <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader>
                    <CardTitle className="text-3xl text-white">Impressum</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-8 text-sm leading-6 text-white/70">
                    <p>
                        LongLink SAGL
                        <br />
                        Legal entity details to be completed by the operator.
                    </p>
                    <p>
                        This page is reserved for the legally required company and contact information for the LongLink
                        service.
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
