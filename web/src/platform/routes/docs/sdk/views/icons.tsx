import ViewLayout from './view-layout';
import { Box, Grid, Icon, Stack } from '@/components/longlink';

/** Documents Icon in LongLink Views. */
export default function IconsPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Icon"
            example={{
                title: 'Icon',
                preview: <IconExample />,
                code: `function Example() {
  const icons = [
    'search', 'info', 'check', 'triangle-exclamation-point',
    'calendar', 'clock', 'users', 'database',
    'copy', 'upload', 'trash', 'wrench'
  ];

  return (
    <Stack align="center" gap={6}>
      <Box width="100%">
        <Grid columns={{ base: 2, sm: 3, xl: 4 }} gap={6} padding={4}>
          {icons.map((icon) => (
            <Stack key={icon} direction="horizontal" align="center" justify="center" gap={4}>
              {['sm', 'md', 'lg'].map((size) => (
                <Icon key={size} icon={icon} size={size} />
              ))}
            </Stack>
          ))}
        </Grid>
      </Box>
      <Stack direction="horizontal" wrap="wrap" align="center" justify="center" gap={4}>
        {['outline', 'elevated', 'soft', 'solid', 'frame'].map((tile) => (
          <Icon key={tile} icon="sparkles" size="lg" tile={tile} />
        ))}
      </Stack>
      <Stack direction="horizontal" wrap="wrap" align="center" justify="center" gap={4}>
        {['primary', 'secondary', 'outline', 'destructive'].map((variant) => (
          <Icon key={variant} icon="sparkles" size="lg" tile="soft" variant={variant} />
        ))}
      </Stack>
    </Stack>
  );
}`
            }}
        />
    );
}

/** Renders the page's icon example for documentation and the catalog. */
export function IconExample() {
    const icons = [
        'search',
        'info',
        'check',
        'triangle-exclamation-point',
        'calendar',
        'clock',
        'users',
        'database',
        'copy',
        'upload',
        'trash',
        'wrench'
    ] as const;

    // Compare every supported size across a responsive grid of icons.
    return (
        <Stack align="center" gap={6}>
            <Box width="100%">
                <Grid columns={{ base: 2, sm: 3, xl: 4 }} gap={6} padding={4}>
                    {icons.map((icon) => (
                        <Stack key={icon} direction="horizontal" align="center" justify="center" gap={4}>
                            {(['sm', 'md', 'lg'] as const).map((size) => (
                                <Icon key={size} icon={icon} size={size} />
                            ))}
                        </Stack>
                    ))}
                </Grid>
            </Box>
            <Stack direction="horizontal" wrap="wrap" align="center" justify="center" gap={4}>
                {(['outline', 'elevated', 'soft', 'solid', 'frame'] as const).map((tile) => (
                    <Icon key={tile} icon="sparkles" size="lg" tile={tile} />
                ))}
            </Stack>
            <Stack direction="horizontal" wrap="wrap" align="center" justify="center" gap={4}>
                {(['primary', 'secondary', 'outline', 'destructive'] as const).map((variant) => (
                    <Icon key={variant} icon="sparkles" size="lg" tile="soft" variant={variant} />
                ))}
            </Stack>
        </Stack>
    );
}
