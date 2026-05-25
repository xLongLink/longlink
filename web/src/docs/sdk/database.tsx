import MarkdownDoc from '../MarkdownDoc';
import markdown from '../../../docs/sdk/database.md?raw';

/** Renders the SDK database page. */
export default function SdkDatabasePage() {
    return <MarkdownDoc content={markdown} />;
}
