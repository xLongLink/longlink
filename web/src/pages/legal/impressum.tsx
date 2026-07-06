import { A } from '@/components/ui/a';
import { Heading } from '@/components/ui/heading';

export const metadata = {
    lastUpdated: '2026-07-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/legal/impressum.tsx',
};

export const content = (
    <>
        <Heading id="impressum" level="h1">
            Impressum
        </Heading>

        <section className="space-y-3">
            <Heading id="company" level="h2">
                Company
            </Heading>
            <p>LongLink SAGL</p>
            <p>Company registration number (UID): CHE-150.642.313</p>
            <p>Legal form: Limited liability company (Sagl)</p>
        </section>

        <section className="space-y-3">
            <Heading id="contact" level="h2">
                Contact
            </Heading>
            <p>
                Email: <A href="mailto:info@longlink.ch">info@longlink.ch</A>
            </p>
        </section>
    </>
);
