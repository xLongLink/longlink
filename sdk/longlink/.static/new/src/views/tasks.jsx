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

/** Validates task values with the standard shadcn React Hook Form pattern. */
function TaskForm({ onSuccess, onCancel }) {
    const form = useForm({ resolver: zodResolver(taskSchema), defaultValues: { title: '', attachment: null } });
    const submit = useSubmit('/api/tasks', {
        onSuccess,
        onError: () => form.setError('root', { message: 'Could not create the task. Please try again.' })
    });

    /** Preserves the attachment as binary form data rather than serializing it as JSON. */
    async function createTask(values) {
        const data = new FormData();

        data.append('title', values.title);
        if (values.attachment) data.append('attachment', values.attachment);
        await submit(data);
    }

    return (
        <form onSubmit={form.handleSubmit(createTask)} noValidate aria-busy={form.formState.isSubmitting}>
            <fieldset disabled={form.formState.isSubmitting} className="contents">
                <FieldGroup>
                    <Controller
                        name="title"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="task-title">Title</FieldLabel>
                                <Input {...field} id="task-title" aria-invalid={fieldState.invalid} />
                                <FieldError errors={[fieldState.error]} />
                            </Field>
                        )}
                    />
                    <Controller
                        name="attachment"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="task-attachment">Attachment</FieldLabel>
                                <Input
                                    id="task-attachment"
                                    name={field.name}
                                    type="file"
                                    ref={field.ref}
                                    onBlur={field.onBlur}
                                    onChange={(event) => field.onChange(event.target.files?.[0] ?? null)}
                                    aria-invalid={fieldState.invalid}
                                    aria-describedby="task-attachment-error"
                                    required
                                />
                                <FieldError id="task-attachment-error" errors={[fieldState.error]} />
                            </Field>
                        )}
                    />
                    <Stack direction="horizontal" justify="end" gap={2}>
                        <Button type="button" variant="ghost" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit">Create task</Button>
                    </Stack>
                    <FieldError errors={[form.formState.errors.root]} />
                </FieldGroup>
            </fieldset>
        </form>
    );
}

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
                                    <Link href={`/api/tasks/${task.id}/attachment`} preview={task.attachment}>
                                        {task.attachment}
                                    </Link>
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
                {isOpen && <TaskForm onSuccess={() => setIsOpen(false)} onCancel={() => setIsOpen(false)} />}
            </FramedDialog>
        </Stack>
    );
}
