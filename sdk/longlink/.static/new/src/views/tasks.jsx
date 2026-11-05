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
                                    <Link to={`/api/tasks/${task.id}/attachment`} download={task.attachment}>
                                        {task.attachment}
                                    </Link>
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
