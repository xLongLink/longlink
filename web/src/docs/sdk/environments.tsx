import MarkdownDoc from '../MarkdownDoc';
import markdown from '../../../docs/sdk/environments.md?raw';

/** Renders the SDK environments page. */
export default function SdkEnvironmentsPage() {
    return <MarkdownDoc content={markdown} />;
}
