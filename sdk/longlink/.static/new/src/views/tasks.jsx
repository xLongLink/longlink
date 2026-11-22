const taskSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, 'Enter a title.')
        .refine((value) => Array.from(value).length <= 255, 'Use no more than 255 characters.'),
    attachment: z
        .instanceof(File)
        .nullable()
        .refine((file) => file !== null, 'Choose an attachment.')
        .refine((file) => file === null || file.size <= 10485760, 'Choose a file smaller than 10 MB.')
});

/** Validates task values with the form schema. */
function TaskForm({ onSuccess, onCancel }) {
    const form = useForm('/api/tasks', {
        schema: taskSchema,
        defaultValues: { title: '', attachment: null },
        onSuccess
    });

    return (
        <form onSubmit={form.onSubmit} noValidate aria-busy={form.formState.isSubmitting}>
            <fieldset disabled={form.formState.isSubmitting} className="contents">
                <Stack gap={4}>
                    <Input
                        {...form.register('title')}
                        id="task-title"
                        label="Title"
                        error={form.formState.errors.title?.message}
                    />
                    <Controller
                        name="attachment"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Input
                                id="task-attachment"
                                label="Attachment"
                                name={field.name}
                                type="file"
                                ref={field.ref}
                                onBlur={field.onBlur}
                                onChange={(event) => field.onChange(event.target.files?.[0] ?? null)}
                                error={fieldState.error?.message}
                                required
                            />
                        )}
                    />
                    <Stack direction="horizontal" justify="end" gap={2}>
                        <Button type="button" variant="ghost" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit">Create task</Button>
                    </Stack>
                    {form.formState.errors.root?.message && (
                        <Text role="alert">{form.formState.errors.root.message}</Text>
                    )}
                </Stack>
            </fieldset>
        </form>
    );
}

/** Lists saved tasks and creates new tasks through a dialog form. */
export default function Tasks() {
    // Load persisted tasks and keep the dialog's open state local to this View.
    const [tasks] = useApi('/api/tasks');
    const [isOpen, setIsOpen] = useState(false);
    const [preview, setPreview] = useState(null);
    const table = useTable({
        features: dataGridFeatures,
        manualPagination: true,
        data: tasks,
        getRowId: (task) => task.id,
        columns: [
            {
                accessorKey: 'title',
                header: 'Task',
                size: 300,
                enableSorting: false,
                cell: ({ row: { original: task } }) => (
                    <Stack gap={0}>
                        <Text>{task.title}</Text>
                        {task.attachment ? (
                            <Link onClick={() => setPreview(task)} aria-haspopup="dialog">
                                {task.attachment}
                            </Link>
                        ) : (
                            <Text tone="muted">No attachment</Text>
                        )}
                    </Stack>
                )
            },
            {
                accessorKey: 'created_by',
                header: 'Created by',
                size: 150,
                enableSorting: false,
                cell: ({ row: { original: task } }) => (
                    <Stack direction="horizontal" align="center" gap={2}>
                        <Avatar name={task.created_by.name} src={task.created_by.avatar} size="sm" />
                        <Stack gap={0}>
                            <Text>{task.created_by.name}</Text>
                            <Text size="xs" tone="muted">
                                {task.created_by.email}
                            </Text>
                        </Stack>
                    </Stack>
                )
            }
        ]
    });

    return (
        <Stack gap={4} paddingInline={8} paddingBlock={2}>
            <Stack direction="horizontal" align="center" justify="between" gap={3}>
                <Heading level={1}>Tasks</Heading>
                <Button onClick={() => setIsOpen(true)}>
                    <Icon icon="plus" size="sm" />
                    Add task
                </Button>
            </Stack>
            <DataGrid
                table={table}
                tableLayout={{ rowBorder: true, headerBorder: true }}
                emptyMessage={<Empty title="No tasks yet" description="Select Add task to create your first task." />}
            >
                <DataGridContainer>
                    <DataGridScrollArea orientation="horizontal">
                        <DataGridTable />
                    </DataGridScrollArea>
                </DataGridContainer>
            </DataGrid>
            <Dialog title="Add task" open={isOpen} onOpenChange={setIsOpen}>
                {isOpen && <TaskForm onSuccess={() => setIsOpen(false)} onCancel={() => setIsOpen(false)} />}
            </Dialog>
            {preview !== null && (
                <Dialog open fullscreen title={preview.attachment} onOpenChange={() => setPreview(null)}>
                    <FileViewer src={`/api/tasks/${preview.id}/attachment`} title={preview.attachment} />
                </Dialog>
            )}
        </Stack>
    );
}
