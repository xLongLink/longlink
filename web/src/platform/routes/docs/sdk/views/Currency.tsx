import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Currency } from '@/components/ui/Currency';

/** Documents locale-aware currency formatting. */
export default function CurrencyPage() {
    // Render currency formatting guidance and an authored example.
    return (
        <ViewLayout
            name="Currency"
            isLongLinkSpecific
            properties={[
                {
                    name: 'value',
                    type: 'number',
                    description: 'Amount to format in currency units.',
                },
                {
                    name: 'currency',
                    type: 'string',
                    description: 'ISO 4217 currency code, such as USD or CHF.',
                },
                {
                    name: 'locale',
                    type: 'string',
                    description: "Locale for formatting; omitted values use the viewer's locale.",
                },
            ]}
            introduction="Currency formats a numeric value with the browser’s locale-aware currency formatter."
            example={{
                title: 'Currency',
                preview: <CurrencyExample />,
                code: `function Example() {
  return <Currency value={1234.5} currency="USD" />;
}`,
            }}
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
