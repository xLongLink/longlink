/** Lists saved tasks and creates new tasks through a dialog form. */
export default function Tasks() {
    // Load persisted tasks and keep the dialog's open state local to this View.
    const [tasks] = useApi('/api/tasks');
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Stack gap={4} paddingInline={8} paddingBlock={2}>
            <Stack direction="horizontal" align="center" justify="between" gap={3}>
                <Heading level={1}>Tasks</Heading>
                <Button onClick={() => setIsOpen(true)}>
                    <Icon icon="plus" size="sm" />
                    Add task
                </Button>
            </Stack>
            <DataTable
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
                                    <AttachmentLink href={`/api/tasks/${task.id}/attachment`} preview={task.attachment}>
                                        {task.attachment}
                                    </AttachmentLink>
                                ) : (
                                    <Text className="text-muted-foreground">No attachment</Text>
                                )}
                            </Stack>
                        )
                    },
                    {
                        key: 'created_by',
                        header: 'Created by',
                        width: proportional(1),
                        renderCell: (task) => (
                            <Stack direction="horizontal" align="center" gap={2}>
                                <GeneratedAvatar
                                    name={task.created_by.name}
                                    seed={task.created_by.id}
                                    src={task.created_by.avatar}
                                    size="sm"
                                />
                                <Stack gap={0}>
                                    <Text>{task.created_by.name}</Text>
                                    <Text className="text-xs text-muted-foreground">{task.created_by.email}</Text>
                                </Stack>
                            </Stack>
                        )
                    }
                ]}
            />
            <FramedDialog title="Add task" open={isOpen} onOpenChange={setIsOpen}>
                {isOpen && (
                    <Form action="/api/tasks" onSuccess={() => setIsOpen(false)}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="task-title">Title</FieldLabel>
                                <Input id="task-title" name="title" maxLength={255} required />
                            </Field>
                            <FileInput name="attachment" label="Attachment" maxSize={10485760} required />
                            <Stack direction="horizontal" justify="end" gap={2}>
                                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Create task</Button>
                            </Stack>
                        </FieldGroup>
                    </Form>
                )}
            </FramedDialog>
        </Stack>
    );
}
