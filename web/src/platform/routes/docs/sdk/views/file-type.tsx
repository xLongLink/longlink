import ViewLayout from './view-layout';
import { Stack, FileType } from '@/components/longlink';

/** Documents FileType in LongLink Views. */
export default function FileTypePage() {
    // Document the fixed FileType appearance and supported presets.
    return (
        <ViewLayout
            name="FileType"
            example={{
                title: 'File types',
                preview: <FileTypeExample />,
                code: `function Example() {
  return (
    <Stack direction="horizontal" wrap="wrap" align="center" justify="center" gap={4}>
      <FileType type="pdf" />
      <FileType type="docx" variant="solid" />
      <FileType type="xlsx" variant="light" />
      <FileType type="zip" variant="mono" />
      <FileType type="image" />
      <FileType type="folder" />
    </Stack>
  );
}`
            }}
        />
    );
}

/** Renders the file type example for documentation and the catalog. */
export function FileTypeExample() {
    // Keep mixed file types in a wrapping row at their native size.
    return (
        <Stack direction="horizontal" wrap="wrap" align="center" justify="center" gap={4}>
            <FileType type="pdf" />
            <FileType type="docx" variant="solid" />
            <FileType type="xlsx" variant="light" />
            <FileType type="zip" variant="mono" />
            <FileType type="image" />
            <FileType type="folder" />
        </Stack>
    );
}
