import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { componentDocumentation } from '@/platform/docs';
import { Table, proportional } from '@astryxdesign/core/Table';

// Use the same hook descriptions as the SDK command output.
const hooks = componentDocumentation.find((component) => component.name === 'Hooks')?.members ?? [];

/** Documents the hooks exposed by the View runtime. */
export default function HooksPage() {
    // Render the runtime-specific hooks table.
    return (
        <ViewLayout
            name="Hooks"
            introduction="LongLink supplies these hooks directly in Views, without imports or a React. prefix. Call hooks at the top level of a component, never inside conditions or loops."
            toc={[{ id: 'hooks', label: 'Hooks', level: 2 }]}
        >
            <Heading id="hooks" level={2}>
                Hooks
            </Heading>
            <Table
                data={hooks}
                idKey="name"
                density="compact"
                columns={[
                    {
                        key: 'name',
                        header: 'Hook',
                        width: proportional(1),
                        renderCell: (hook) => (
                            <Stack gap={0}>
                                <Text>{hook.name}</Text>
                                <Text type="supporting">{hook.description}</Text>
                            </Stack>
                        ),
                    },
                ]}
            />
        </ViewLayout>
    );
}
