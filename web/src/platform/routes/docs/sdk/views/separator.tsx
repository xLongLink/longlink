import ViewLayout from './view-layout';
import { Box, Separator, Stack, Text } from '@/components/longlink';

export function SeparatorExample() {
    return (
        <Box width={240} maxWidth="100%">
            <Stack gap={2}>
                <Text>Order summary</Text>
                <Separator />
                <Stack direction="horizontal" align="center" gap={2}>
                    <Text>8 items</Text>
                    <Separator orientation="vertical" />
                    <Text>Paid</Text>
                </Stack>
            </Stack>
        </Box>
    );
}

export default function SeparatorPage() {
    return (
        <ViewLayout
            name="Separator"
            example={{
                title: 'Separator',
                preview: <SeparatorExample />,
                code: `/** Separates sections horizontally and details vertically. */
export default function OrderSummary() {
  return (
    <Box width={240} maxWidth="100%">
      <Stack gap={2}>
        <Text>Order summary</Text>
        <Separator />
        <Stack direction="horizontal" align="center" gap={2}>
          <Text>8 items</Text>
          <Separator orientation="vertical" />
          <Text>Paid</Text>
        </Stack>
      </Stack>
    </Box>
  );
}`
            }}
        />
    );
}
