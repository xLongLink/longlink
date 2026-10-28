import * as pricing from '@/platform/pricing';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Blockquote } from '@astryxdesign/core/Blockquote';
import { Table, proportional } from '@astryxdesign/core/Table';
import { DocumentationArticle } from '@/components/layouts/Article';

const article = {
    title: 'Billing | LongLink Platform Documentation',
    description: 'Understand Organization usage, payment methods, and monthly invoices.',
    toc: [
        { id: 'billing', label: 'Billing', level: 1 },
        { id: 'payment-methods', label: 'Payment Methods', level: 2 },
        { id: 'invoices', label: 'Invoices', level: 2 },
    ],
    lastUpdated: '2026-10-17',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/Billing.tsx',
};

/** Documents Organization billing in one Platform article using the current pricing constants. */
export default function Billing() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="billing" level={1}>
                    Billing
                </Heading>
                <Blockquote className="border-s-(--color-text-orange) text-(--color-text-orange)">
                    <Stack gap={0}>
                        <Text type="inherit">Beta notice: This page is being built.</Text>
                        <Link color="inherit" href={article.editUrl} hasUnderline isExternalLink type="inherit">
                            Edit on GitHub
                        </Link>
                    </Stack>
                </Blockquote>
                <Text as="p">
                    Manage usage, payment methods, and invoices in Organization Settings → Billing. You only pay for
                    usage above the free amounts below.
                </Text>
                <Table
                    data={pricing.resources}
                    idKey="id"
                    density="compact"
                    columns={[
                        { key: 'resource', header: 'Resource', width: proportional(1) },
                        { key: 'included', header: 'Included free', width: proportional(1) },
                        { key: 'rate', header: 'Monthly excess rate', width: proportional(2) },
                    ]}
                />
                <Heading id="payment-methods" level={2}>
                    Payment Methods
                </Heading>
                <Text as="p">
                    An Organization owner can open Billing → Payment Methods and select Add card. Stripe securely
                    collects the card details. Saving a card does not take an immediate payment.
                </Text>
                <Text as="p">
                    The most recently added card becomes the default for monthly payments. A saved card is required
                    before adding users beyond the free allowance.
                </Text>
                <Heading id="invoices" level={2}>
                    Invoices
                </Heading>
                <Text as="p">
                    Once a card is registered, a monthly invoice is created in CHF. Stripe charges your default card for
                    usage above the free amounts. If everything stays within those amounts, the invoice shows CHF 0 and
                    no payment is taken.
                </Text>
                <Text as="p">
                    Invoices list month-end user counts and storage quantities with their unit prices. Billable database
                    and file storage are rounded up to whole MiB after subtracting the free allowances. A free-tier
                    discount below the subtotal keeps usage within the free allowances at CHF 0.
                </Text>
                <Text as="p">
                    Owners can open Billing → Invoices to view invoices and payment status. Select an invoice number to
                    open it, or PDF to view a copy in a new tab when available.
                </Text>
                <Text as="p">
                    Contact{' '}
                    <Link href="mailto:info@longlink.dev" hasUnderline type="inherit">
                        info@longlink.dev
                    </Link>{' '}
                    if you need help with a payment or invoice.
                </Text>
            </Stack>
        </DocumentationArticle>
    );
}
