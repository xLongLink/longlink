/** Lists bundled files with on-demand preview dialogs. */
export default function Files() {
    return (
        <Stack gap={4} paddingInline={8} paddingBlock={2}>
            <Heading level={1}>Files</Heading>
            <DataTable
                data={[
                    { format: 'PNG', filename: 'example.png' },
                    { format: 'JPEG', filename: 'garden.jpg' },
                    { format: 'GIF', filename: 'example.gif' },
                    { format: 'WebP', filename: 'example.webp' },
                    { format: 'PDF', filename: 'example.pdf' },
                    { format: 'Text', filename: 'example.txt' },
                    { format: 'Python', filename: 'example.py' },
                    { format: 'JSON', filename: 'example.json' },
                    { format: 'TSX', filename: 'example.tsx' },
                    { format: 'YAML', filename: 'example.yaml' }
                ]}
                columns={[
                    {
                        key: 'filename',
                        header: 'File',
                        width: proportional(2),
                        renderCell: (file) => (
                            <Link to={`/assets/${file.filename}`} preview={file.filename}>
                                {file.filename}
                            </Link>
                        )
                    },
                    { key: 'format', header: 'Format', width: proportional(1) }
                ]}
            />
        </Stack>
    );
}
