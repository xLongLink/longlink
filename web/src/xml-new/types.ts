export type XmlNode = {
    tagName: string;
    attributes: Record<string, string>;
    children: XmlNode[];
};

export type Store = Record<string, any>;

export type XmlContext = {
    store: Store;
    scope: Record<string, any>;
};

export type XmlComponentProps = {
    props: Record<string, string>;
    children?: XmlNode[];
};
