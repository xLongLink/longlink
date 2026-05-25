import MarkdownDoc from '../MarkdownDoc';
import markdown from '../../../docs/xml/components.md?raw';

/** Renders the XML components page. */
export default function XmlComponentsPage() {
    return <MarkdownDoc content={markdown} />;
}
