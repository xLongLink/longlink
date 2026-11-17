import ViewLayout from './view-layout';
import { FileType } from '@/components/longlink/display/file-type';

/** Documents FileType in LongLink Views. */
export default function FileTypePage() {
    // Document the fixed FileType appearance and supported presets.
    return (
        <ViewLayout
            name="FileType"
            properties={[
                { name: 'type', type: 'string' },
                { name: 'variant', type: '"outline" | "solid" | "light" | "mono"' },
                { name: 'size', type: '"mini" | "xs" | "sm" | "md" | "lg" | "xl"' },
                { name: 'label', type: 'ReactNode' },
                { name: 'glyph', type: 'boolean' },
                { name: 'icon', type: 'ReactNode' }
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
