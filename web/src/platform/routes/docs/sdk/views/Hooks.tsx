import ViewLayout from './ViewLayout';
import { viewHooks } from '@/lib/documentation';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';
import { NativeTable as Table, proportional } from '@/components/ui/NativeTable';

/** Documents the hooks exposed by the View runtime. */
export default function HooksPage() {
    // Render the runtime-specific hooks table.
    return (
        <ViewLayout name="Hooks" toc={[{ id: 'hooks', label: 'Hooks', level: 2 }]}>
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
