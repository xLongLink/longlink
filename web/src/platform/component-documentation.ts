import * as publications from './publications';
import viewCatalog from '../../../sdk/longlink/.static/jsx/components.json';

export const componentDocumentation = publications.componentDocumentation.map((component) => {
    // Share component ownership and custom justifications with the packaged SDK documentation.
    const provenance = viewCatalog.components.find((entry) => entry.name === component.name);

    if (!provenance) throw new Error(`Missing component provenance: ${component.name}`);

    return {
        ...component,
        source: provenance.source,
        sourceLabel:
            provenance.source === 'recharts'
                ? 'shadcn/ui + Recharts'
                : provenance.source === 'shadcn'
                  ? 'shadcn/ui'
                  : provenance.source === 'reui'
                    ? 'ReUI'
                    : 'Custom',
        reference: 'reference' in provenance ? provenance.reference : undefined,
        justification: 'justification' in provenance ? provenance.justification : undefined
    };
});
