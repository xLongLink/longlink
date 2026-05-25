import MarkdownDoc from '../MarkdownDoc';
import markdown from '../../../docs/xml/index.md?raw';

/** Renders the XML pages overview. */
export default function XmlOverviewPage() {
    return <MarkdownDoc content={markdown} />;
}
