import ViewLayout from './view-layout';
import { Currency } from '@/components/longlink';

/** Documents locale-aware currency formatting. */
export default function CurrencyPage() {
    // Render currency formatting guidance and an authored example.
    return (
        <ViewLayout
            name="Currency"
            example={{
                title: 'Currency',
                preview: <CurrencyExample />,
                code: `function Example() {
  return <Currency value={1234.5} currency="USD" />;
}`
            }}
        />
    );
}

/** Renders the page's locale-aware currency example. */
function CurrencyExample() {
    // Format a sample amount using the real View component.
    return <Currency value={1234.5} currency="USD" />;
}
