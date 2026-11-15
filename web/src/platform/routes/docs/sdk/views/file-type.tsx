import ViewLayout from './view-layout';
import { FileType } from '@/components/longlink/file-type';

/** Documents FileType in LongLink Views. */
export default function FileTypePage() {
    // Document the fixed FileType appearance and supported presets.
    return (
        <ViewLayout
            name="FileType"
            properties={[
                {
                    name: 'type',
                    type: 'string',
                    description:
                        'Extension such as "pdf" or ".docx", family such as "image" or "folder", or "empty". Unknown extensions render as neutral files.'
                },
                {
                    name: 'variant',
                    type: '"outline" | "solid" | "light" | "mono"',
                    description: 'Appearance. Defaults to "outline".'
                },
                {
                    name: 'size',
                    type: '"mini" | "xs" | "sm" | "md" | "lg" | "xl"',
                    description: 'Icon size. Defaults to "md".'
                },
                {
                    name: 'label',
                    type: 'ReactNode',
                    description: 'Replaces the extension label. Use null or an empty string to hide it.'
                },
                { name: 'glyph', type: 'boolean', description: 'Shows the family glyph instead of the label.' },
                { name: 'icon', type: 'ReactNode', description: 'Custom icon replacing the label and family glyph.' }
            ]}
            example={{
                title: 'File types',
                preview: <FileTypeExample />,
                code: `function Example() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <FileType type="pdf" />
      <FileType type="docx" variant="solid" />
      <FileType type="xlsx" variant="light" />
      <FileType type="zip" variant="mono" />
      <FileType type="image" />
      <FileType type="folder" />
    </div>
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
        <div className="flex flex-wrap items-center justify-center gap-4">
            <FileType type="pdf" />
            <FileType type="docx" variant="solid" />
            <FileType type="xlsx" variant="light" />
            <FileType type="zip" variant="mono" />
            <FileType type="image" />
            <FileType type="folder" />
        </div>
    );
}
