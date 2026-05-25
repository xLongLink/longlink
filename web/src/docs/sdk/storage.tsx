import MarkdownDoc from '../MarkdownDoc';
import markdown from '../../../docs/sdk/storage.md?raw';

/** Renders the SDK storage page. */
export default function SdkStoragePage() {
    return <MarkdownDoc content={markdown} />;
}
