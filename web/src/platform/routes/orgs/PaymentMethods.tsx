import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks/use-api';
import { Text } from '@/components/astryx/Text';
import { Stack } from '@/components/astryx/Stack';
import { Token } from '@/components/astryx/Token';
import { Divider } from '@/components/ui/Divider';
import { Button } from '@/components/astryx/Button';
import { Heading } from '@/components/astryx/Heading';
import { ApiBoundary } from '@/components/ApiBoundary';
import { Table, proportional } from '@/components/astryx/Table';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

/** Owns card registration and saved-card reads only while Payment Methods is active. */
export default function PaymentMethods({ base, canManage }: { base: string; canManage: boolean }) {
    const [usage] = useApi(`${base}/usage`, schemas.zOrganizationUsage);

    /** Opens owner-authorized Stripe card registration without an immediate payment. */
    async function registerCard() {
        const response = await api.post(`${base}/cards/checkout`).json(schemas.zPaymentRedirect);

        // Redirect only after validating the API's hosted URL.
        window.location.assign(response.url);
    }

    return (
        <Stack gap={4}>
            <Stack direction="horizontal" justify="between" align="end" wrap="wrap" minHeight="var(--size-element-md)">
                <Heading level={2} hasCapsize>
                    Payment Methods
                </Heading>
                {usage.stripe_enabled && canManage && (
                    <Button label="Add card" size="sm" variant="primary" clickAction={registerCard} />
                )}
            </Stack>
            <Divider />
            {!usage.stripe_enabled ? (
                <Text as="p" color="secondary">
                    Card registration is not enabled on this deployment.
                </Text>
            ) : canManage ? (
                <ApiBoundary fallback={<Text color="secondary">Loading registered cards…</Text>}>
                    <RegisteredCards base={base} />
                </ApiBoundary>
            ) : (
                <Text as="p" color="secondary">
                    An organization owner can view and register cards.
                </Text>
            )}
        </Stack>
    );
}

/** Shows masked Stripe card details without storing payment metadata in LongLink. */
function RegisteredCards({ base }: { base: string }) {
    const [cards] = useApi(`${base}/cards`, schemas.zPaymentCard.array());

    return (
        <Table
            data={cards}
            idKey="id"
            density="compact"
            columns={[
                {
                    key: 'brand',
                    header: 'Card',
                    width: proportional(2),
                    renderCell: (card) => (
                        <Text className="capitalize">
                            {card.brand.replaceAll('_', ' ')} •••• {card.last4}
                        </Text>
                    ),
                },
                {
                    key: 'exp_month',
                    header: 'Expires',
                    width: proportional(1),
                    renderCell: (card) => `${String(card.exp_month).padStart(2, '0')}/${card.exp_year}`,
                },
                {
                    key: 'is_default',
                    header: 'Status',
                    width: proportional(1),
                    renderCell: (card) => (card.is_default ? <Token label="Default" /> : null),
                },
            ]}
        />
    );
}
