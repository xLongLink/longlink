import MarkdownDoc from '../MarkdownDoc';
import markdown from '../../../docs/xml/field.md?raw';

/** Renders the XML field page. */
export default function XmlFieldPage() {
    return <MarkdownDoc content={markdown} />;
}
