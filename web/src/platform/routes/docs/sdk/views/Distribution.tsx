import ViewLayout from './ViewLayout';
import { Text } from '@/components/ui/Text';
import { Stack } from '@/components/ui/Stack';
import { Distribution } from '@/components/ui/Distribution';

/** Documents a theme-colored composition strip with an accessible value summary. */
export default function DistributionPage() {
    // Keep colors and widths derived from validated values instead of custom View styling.
    return (
        <ViewLayout
            name="Distribution"
            isLongLinkSpecific
            introduction="Displays non-negative parts of a whole as a compact, theme-colored strip. Keep the labels and exact values visible in an adjacent List or summary."
            properties={[
                { name: 'label', type: 'string', description: 'Required accessible name for the distribution.' },
                {
                    name: 'segments',
                    type: 'readonly { label: string; value: number; color?: "accent" | "success" | "neutral" | "blue" | "purple" | "green" | "orange" | "pink" }[]',
                    description:
                        'Uniquely labeled finite non-negative values. Zero values occupy no space; empty data displays an empty rail.',
                },
            ]}
            example={{
                title: 'Project status distribution',
                preview: (
                    <Stack gap={3}>
                        <Distribution
                            label="8 active projects and 2 completed projects"
                            segments={[
                                { label: 'In progress', value: 8, color: 'accent' },
                                { label: 'Completed', value: 2, color: 'success' },
                            ]}
                        />
                        <Text>In progress: 8 · Completed: 2</Text>
                    </Stack>
                ),
                code: `function Example() {
  return (
    <Stack gap={3}>
      <Distribution
        label="8 active projects and 2 completed projects"
        segments={[
          { label: 'In progress', value: 8, color: 'accent' },
          { label: 'Completed', value: 2, color: 'success' },
        ]}
      />
      <Text>In progress: 8 · Completed: 2</Text>
    </Stack>
  );
}`,
            }}
        />
    );
}
