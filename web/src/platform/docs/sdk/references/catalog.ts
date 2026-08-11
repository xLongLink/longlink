export type PageReferenceCatalog = {
    name: string;
    slug: string;
    category: string;
    summary: string;
    usage: string;
    example: string;
    attributes: {
        name: string;
        description: string;
        required?: boolean;
    }[];
    attributesTitle?: string;
    children?: string;
};
