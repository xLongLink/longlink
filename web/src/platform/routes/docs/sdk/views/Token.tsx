import ViewLayout from './ViewLayout';
import { Stack } from '@/components/ui/Stack';
import { Token } from '@/components/ui/Token';

/** Documents tags and removable selections in LongLink Views. */
export default function TokenPage() {
    // Show metadata tokens and a selection that can be removed without navigating.
    return (
        <ViewLayout
            name="Token"
            introduction={'Displays a tag, category, or selection with optional click and removal actions.'}
            properties={[
                {
                    name: 'label',
                    type: 'string',
                    description: 'Visible text and accessible name for the token. Long labels truncate to fit.',
                },
                {
                    name: 'size',
                    type: '"sm" | "lg" | "md"',
                    description: 'The size of the token.',
                },
                {
                    name: 'icon',
                    type: 'StoneIconName',
                    description: 'Optional icon rendered before the label.',
                },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Disables the token.',
                },
                {
                    name: 'description',
                    type: 'string',
                    description: 'Accessible description of the tag or selection.',
                },
                {
                    name: 'onClick',
                    type: '() => void',
                    description:
                        'Runs when the token is clicked. Use Button or Link for primary actions or navigation.',
                },
                {
                    name: 'onRemove',
                    type: '() => void',
                    description: 'Shows a remove button and runs when it is clicked.',
                },
            ]}
            example={{
                title: 'Interests',
                preview: <TokenExample />,
                code: `function Example() {
  return (
    <Stack direction="horizontal" wrap="wrap" gap={2}>
      <Token label="Research" />
      <Token label="Open source" />
    </Stack>
  );
}`,
            }}
        />
    );
}

/** Renders interest tokens for the documentation page and catalog. */
export function TokenExample() {
    // Keep related metadata together in a wrapping row.
    return (
        <Stack direction="horizontal" wrap="wrap" gap={2}>
            <Token label="Research" />
            <Token label="Open source" />
        </Stack>
    );
}
