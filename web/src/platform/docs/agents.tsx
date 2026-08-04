import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { DocsBanner } from '@/components/DocsBanner';

export const metadata = {
    toc: [{ id: 'agents', label: 'Agents', level: 1 }],
    lastUpdated: '2026-07-29',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/agents.tsx',
};

export const content = (
    <Stack gap={5}>
        <DocsBanner variant="agents" />
        <Heading id="agents" level={1}>
            Agents
        </Heading>
        <Text as="p">Coming Soon</Text>
    </Stack>
);
