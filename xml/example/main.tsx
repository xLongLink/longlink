import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { createState, renderNode } from '../src';
import { registry } from './registry';
import { xmlTree } from './xml';
import { QueryClientProvider } from '@tanstack/react-query';


/* Setup ReactXML */
const queryClient = new QueryClient();
const store = createState({
    pageTitle: 'ReactXML Example',
});
const app = renderNode(xmlTree, registry, store, {
    queryClient,
});


createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            {app}
        </QueryClientProvider>
    </StrictMode>
);

