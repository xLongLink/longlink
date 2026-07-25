import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';

export const metadata = {
    toc: [
        { id: 'company', label: 'Company' },
        { id: 'contact', label: 'Contact' },
    ],
    lastUpdated: '2026-07-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/legal/impressum.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="impressum" level={1}>
            Impressum
        </Heading>

        <Stack as="section" gap={3}>
            <Heading id="company" level={2}>
                Company
            </Heading>
            <Text as="p">LongLink SAGL</Text>
            <Text as="p">Company registration number (UID): CHE-150.642.313</Text>
            <Text as="p">Legal form: Limited liability company (Sagl)</Text>
        </Stack>

        <Stack as="section" gap={3}>
            <Heading id="contact" level={2}>
                Contact
            </Heading>
            <Text as="p">
                Email:{' '}
                <Link href="mailto:info@longlink.ch" hasUnderline type="inherit">
                    info@longlink.ch
                </Link>
            </Text>
        </Stack>
    </Stack>
);
