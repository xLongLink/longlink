import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { componentDocumentation } from '@/platform/docs';
import { Table, proportional } from '@astryxdesign/core/Table';

// Use the same function descriptions as the SDK command output.
const functions = componentDocumentation.find((component) => component.name === 'Functions')?.members ?? [];

/** Documents the non-hook bindings exposed by the View runtime. */
export default function FunctionsPage() {
    // Render the runtime-specific functions table.
    return (
        <ViewLayout
            name="Functions"
            reference={{
                introduction:
                    'LongLink supplies these functions directly in Views, without imports. Requests and navigation are scoped to the current Solution.',
                practices: [],
            }}
            toc={[{ id: 'functions', label: 'Functions', level: 2 }]}
        >
            <Heading id="functions" level={2}>
                Functions
            </Heading>
            <Table
                data={functions}
                idKey="name"
                density="compact"
                columns={[
                    {
                        key: 'name',
                        header: 'Function',
                        width: proportional(1),
                        renderCell: (functionEntry) => (
                            <Stack gap={0}>
                                <Text>{functionEntry.name}</Text>
                                <Text type="supporting">{functionEntry.description}</Text>
                            </Stack>
                        ),
                    },
                ]}
            />
        </ViewLayout>
    );
}
