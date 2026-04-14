import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, renderNode, fromXml } from '../src';
import { registry } from './registry';

/* Fetch the UI tree from the API */
const response = await fetch('http://localhost:8000/');
const xmlTree = fromXml(await response.text());

/* Setup ReactXML */
const queryClient = new QueryClient();
const app = renderNode(
    xmlTree,
    registry,
    createContext({
        scope: {
            pageTitle: 'User Directory',
        },
    })
);

createRoot(document.getElementById('app')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>{app}</QueryClientProvider>
    </StrictMode>
);
