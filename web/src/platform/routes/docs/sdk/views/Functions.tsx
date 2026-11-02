import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, proportional } from '@astryxdesign/core/Table';

// Describe the runtime bindings exposed to Views.
const functions = [
    {
        name: 'navigate(path)',
        description:
            'Navigates within the current Solution using a scoped path, or opens an HTTP(S) URL in a new tab. External URLs require user activation and open without an opener or referrer.',
    },
    {
        name: 'request(path, options)',
        description:
            'Requests a Solution operation and returns its data. Options support the HTTP method, JSON, form data, and binary responses. Successful writes automatically refresh cached View data. Failed HTTP requests reject with an Error containing an optional numeric status and a bounded client-facing message.',
    },
];

/** Documents the non-hook bindings exposed by the View runtime. */
export default function FunctionsPage() {
    // Render the runtime-specific functions table.
    return (
        <ViewLayout
            name="Functions"
            introduction="LongLink supplies these functions directly in Views, without imports. Requests and navigation are scoped to the current Solution."
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
