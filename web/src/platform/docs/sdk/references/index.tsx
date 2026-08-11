import { FileCode2 } from 'lucide-react';
import * as actionReference from './action';
import * as avatarReference from './avatar';
import * as badgeReference from './badge';
import * as bindingsReference from './bindings';
import * as buttonReference from './button';
import * as cardReference from './card';
import * as checkboxInputReference from './checkbox-input';
import * as countReference from './count';
import * as dialogReference from './dialog';
import * as dividerReference from './divider';
import * as expressionsReference from './expressions';
import * as fileInputReference from './file-input';
import * as forReference from './for';
import * as gridReference from './grid';
import * as headingReference from './heading';
import * as i18nReference from './i18n';
import * as iconReference from './icon';
import * as ifReference from './if';
import * as linkReference from './link';
import * as numberInputReference from './number-input';
import * as queryReference from './query';
import * as radioListReference from './radio-list';
import * as radioListItemReference from './radio-list-item';
import * as selectorReference from './selector';
import * as selectorOptionReference from './selector-option';
import * as sideNavReference from './side-nav';
import * as sliderReference from './slider';
import * as stackReference from './stack';
import * as stateReference from './state';
import * as switchReference from './switch';
import * as tabReference from './tab';
import * as tableReference from './table';
import * as textReference from './text';
import * as textAreaReference from './text-area';
import * as textInputReference from './text-input';
import * as valuesReference from './values';

const referenceModules = [
    ifReference,
    i18nReference,
    valuesReference,
    countReference,
    expressionsReference,
    bindingsReference,
    stateReference,
    queryReference,
    actionReference,
    forReference,
    buttonReference,
    linkReference,
    cardReference,
    avatarReference,
    headingReference,
    iconReference,
    textReference,
    checkboxInputReference,
    fileInputReference,
    numberInputReference,
    radioListReference,
    radioListItemReference,
    selectorReference,
    selectorOptionReference,
    sliderReference,
    switchReference,
    textAreaReference,
    textInputReference,
    badgeReference,
    dividerReference,
    gridReference,
    stackReference,
    sideNavReference,
    tabReference,
    dialogReference,
    tableReference,
];

export const pageReferenceDocs = referenceModules.map(({ catalog }) => catalog);

export const pageReferenceDocPages = referenceModules.map(({ catalog, content, metadata }) => ({
    path: `/docs/sdk/pages/${catalog.slug}`,
    title: catalog.name,
    description: catalog.summary,
    icon: <FileCode2 aria-hidden="true" size={16} />,
    content,
    metadata,
}));

export const pageReferenceHrefByName = Object.fromEntries(
    pageReferenceDocPages.map(({ title, path }) => [title, path])
);
