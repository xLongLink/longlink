import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';

export const metadata = {
    lastUpdated: '2026-07-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/legal/impressum.tsx',
};

export const content = (
    <Stack gap={4}>
        <Heading id="impressum" level={1}>
            Impressum
        </Heading>

        <Stack as="section" gap={3}>
            <Heading id="company" level={2}>
                Company
            </Heading>
            <p>LongLink SAGL</p>
            <p>Company registration number (UID): CHE-150.642.313</p>
            <p>Legal form: Limited liability company (Sagl)</p>
        </Stack>

        <Stack as="section" gap={3}>
            <Heading id="contact" level={2}>
                Contact
            </Heading>
            <p>
                Email:{' '}
                <Link href="mailto:info@longlink.ch" type="inherit">
                    info@longlink.ch
                </Link>
            </p>
        </Stack>
    </Stack>
);
