import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Globe } from '@/components/ui/Globe';
import { Stack } from '@/components/ui/Stack';
import { Button } from '@/components/ui/Button';

/** Documents offline geographic presentation and explicit country selection. */
export default function GlobePage() {
    const [country, setCountry] = useState('840');

    return (
        <ViewLayout
            name="Globe"
            isLongLinkSpecific
            introduction="Displays an offline dotted world map with Natural Earth public-domain boundaries. Country selection centers and highlights the globe. Keep country names and statistics visible in an adjacent List; the globe does not fetch statistics or infer geographic values."
            properties={[
                { name: 'label', type: 'string', description: 'Required accessible name describing the map.' },
                {
                    name: 'variant',
                    type: '"overview" | "focus"',
                    description:
                        'Overview shows the complete globe. Focus crops around the selected country with a faded text-safe leading edge.',
                },
                {
                    name: 'children',
                    type: 'ReactNode',
                    description:
                        'Optional normal-flow foreground content. Its natural height defines the map backdrop; no fixed card height is needed.',
                },
                {
                    name: 'country',
                    type: 'string',
                    description:
                        'Optional three-digit ISO 3166-1 numeric country code, such as 840 for the United States, 276 for Germany, or 250 for France. Unknown codes are rejected. Omit for a world overview.',
                },
                {
                    name: 'highlightedCountries',
                    type: 'readonly string[]',
                    description:
                        'Additional three-digit country codes to tint. These do not change the selected country or camera. Unknown codes are rejected.',
                },
            ]}
            example={{
                title: 'Country selection',
                preview: (
                    <Stack gap={3}>
                        <Globe
                            label={country === '840' ? 'United States' : 'Germany'}
                            country={country}
                            highlightedCountries={['840', '276', '250']}
                        />
                        <Stack direction="horizontal" gap={2}>
                            <Button label="United States" onClick={() => setCountry('840')} />
                            <Button label="Germany" onClick={() => setCountry('276')} />
                        </Stack>
                    </Stack>
                ),
                code: `/** Shows a selected country without external map requests. */
function Example() {
  return <Globe label="United States" country="840" highlightedCountries={['840', '276', '250']} />;
}`,
            }}
        />
    );
}
