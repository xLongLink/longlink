import ViewLayout from './ViewLayout';
import { Text } from '@/components/astryx/Text';
import { viewHooks } from '@/lib/documentation';
import { Stack } from '@/components/astryx/Stack';
import { Heading } from '@/components/astryx/Heading';
import { Table, proportional } from '@/components/astryx/Table';

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
                data={viewHooks}
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
