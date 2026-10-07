import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Currency } from '@/components/ui/Currency';

/** Documents locale-aware currency formatting. */
export default function CurrencyPage() {
    // Render currency formatting guidance and an authored example.
    return (
        <ViewLayout
            name="Currency"
            reference={{
                introduction: 'Currency formats a numeric value with the browser’s locale-aware currency formatter.',
                practices: [
                    {
                        guidance: true,
                        description:
                            'Pass a numeric value and a valid currency code. Set locale when a specific regional format is required.',
                    },
                ],
            }}
            examples={[
                {
                    title: 'Currency',
                    preview: <CurrencyExample />,
                    code: `function Example() {
  return <Currency value={1234.5} currency="USD" />;
}`,
                },
            ]}
        />
    );
}

/** Renders the page's locale-aware currency example. */
function CurrencyExample() {
    // Format a sample amount using the real View component.
    return (
        <Text>
            <Currency value={1234.5} currency="USD" />
        </Text>
    );
}
