import ViewLayout from './ViewLayout';

/** Documents locale-aware currency formatting. */
export default function CurrencyPage() {
    // Render currency formatting guidance and an authored example.
    return (
        <ViewLayout
            name="Currency"
            reference={{
                introduction: 'Currency formats a numeric value with the browser’s locale-aware currency formatter.',
                properties: [],
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
                    code: `function Example() {
  return <Currency value={1234.5} currency="USD" />;
}`,
                },
            ]}
        />
    );
}
