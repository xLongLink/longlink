/** Lists saved tasks and creates new tasks through a dialog form. */
export default function Tasks() {
    // Load persisted tasks and keep the dialog's open state local to this View.
    const [tasks] = useApi('/api/tasks');
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Stack gap={4} paddingInline={8} paddingBlock={2}>
            <Stack direction="horizontal" align="center" justify="between" gap={3}>
                <Heading level={1}>Tasks</Heading>
                <Button label="Add task" icon="plus" variant="primary" onClick={() => setIsOpen(true)} />
            </Stack>
            <Table
                data={tasks}
                hasHover
                columns={[
                    {
                        key: 'title',
                        header: 'Task',
                        width: proportional(2),
                        renderCell: (task) => (
                            <Stack gap={0}>
                                <Text>{task.title}</Text>
                                {task.attachment ? (
                                    <FileViewer
                                        src={`/api/tasks/${task.id}/attachment`}
                                        title={task.attachment}
                                        size="sm"
                                    />
                                ) : (
                                    <Text color="secondary">No attachment</Text>
                                )}
                            </Stack>
                        ),
                    },
                    {
                        key: 'created_by',
                        header: 'Created by',
                        width: proportional(1),
                        renderCell: (task) => (
                            <Stack direction="horizontal" align="center" gap={2}>
                                <Avatar
                                    name={task.created_by.name}
                                    seed={task.created_by.id}
                                    src={task.created_by.avatar}
                                    size="sm"
                                />
                                <Stack gap={0}>
                                    <Text>{task.created_by.name}</Text>
                                    <Text type="supporting">{task.created_by.email}</Text>
                                </Stack>
                            </Stack>
                        ),
                    },
                ]}
            />
            <Heading level={2}>Example attachments</Heading>
            <Table
                data={[
                    { format: 'PNG', filename: 'example.png', preview: 'Inline image' },
                    { format: 'JPEG', filename: 'garden.jpg', preview: 'Inline image' },
                    { format: 'GIF', filename: 'example.gif', preview: 'Inline image' },
                    { format: 'WebP', filename: 'example.webp', preview: 'Inline image' },
                    { format: 'PDF', filename: 'example.pdf', preview: 'Native PDF viewer' },
                    { format: 'Text', filename: 'example.txt', preview: 'Text viewer' },
                    { format: 'Python', filename: 'example.py', preview: 'Syntax highlighting' },
                    { format: 'JSON', filename: 'example.json', preview: 'Syntax highlighting' },
                    { format: 'TSX', filename: 'example.tsx', preview: 'Syntax highlighting' },
                    { format: 'YAML', filename: 'example.yaml', preview: 'Syntax highlighting' },
                ]}
                columns={[
                    { key: 'format', header: 'Format', width: proportional(1) },
                    { key: 'preview', header: 'Preview', width: proportional(1) },
                    {
                        key: 'filename',
                        header: 'File',
                        width: proportional(2),
                        renderCell: (file) => (
                            <FileViewer src={`/assets/${file.filename}`} title={file.filename} size="sm" />
                        ),
                    },
                ]}
            />
            <Dialog title="Add task" isOpen={isOpen} onOpenChange={setIsOpen}>
                {isOpen && (
                    <Form action="/api/tasks" onSuccess={() => setIsOpen(false)}>
                        <TextInput name="title" label="Title" maxLength={255} required />
                        <FileInput name="attachment" label="Attachment" maxSize={10485760} required />
                        <Stack direction="horizontal" justify="end" gap={2}>
                            <Button label="Cancel" onClick={() => setIsOpen(false)} />
                            <Button label="Create task" type="submit" variant="primary" />
                        </Stack>
                    </Form>
                )}
            </Dialog>
        </Stack>
    );
}
