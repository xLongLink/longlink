import { FileCode2 } from 'lucide-react';
import * as ifReference from './if';
import * as i18nReference from './i18n';
import * as valuesReference from './values';
import * as countReference from './count';
import * as expressionsReference from './expressions';
import * as bindingsReference from './bindings';
import * as translationsReference from './translations';
import * as dynamicPagesReference from './dynamic-pages';
import * as pageFilesReference from './page-files';
import * as longlinkReference from './longlink';
import * as stateReference from './state';
import * as queryReference from './query';
import * as actionReference from './action';
import * as forReference from './for';
import * as buttonReference from './button';
import * as buttonGroupReference from './button-group';
import * as linkReference from './link';
import * as cardReference from './card';
import * as avatarReference from './avatar';
import * as codeReference from './code';
import * as headingReference from './heading';
import * as iconReference from './icon';
import * as textReference from './text';
import * as checkboxInputReference from './checkbox-input';
import * as fileInputReference from './file-input';
import * as numberInputReference from './number-input';
import * as radioListReference from './radio-list';
import * as radioListItemReference from './radio-list-item';
import * as selectorReference from './selector';
import * as selectorOptionReference from './selector-option';
import * as sliderReference from './slider';
import * as switchReference from './switch';
import * as textAreaReference from './text-area';
import * as textInputReference from './text-input';
import * as badgeReference from './badge';
import * as bannerReference from './banner';
import * as dividerReference from './divider';
import * as formLayoutReference from './form-layout';
import * as gridReference from './grid';
import * as stackReference from './stack';
import * as sideNavReference from './side-nav';
import * as sideNavItemReference from './side-nav-item';
import * as tabReference from './tab';
import * as tabListReference from './tab-list';
import * as dialogReference from './dialog';
import * as tableReference from './table';
import * as tableColumnReference from './table-column';

const referenceModules = [
    ifReference,
    i18nReference,
    valuesReference,
    countReference,
    expressionsReference,
    bindingsReference,
    translationsReference,
    dynamicPagesReference,
    pageFilesReference,
    longlinkReference,
    stateReference,
    queryReference,
    actionReference,
    forReference,
    buttonReference,
    buttonGroupReference,
    linkReference,
    cardReference,
    avatarReference,
    codeReference,
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
    bannerReference,
    dividerReference,
    formLayoutReference,
    gridReference,
    stackReference,
    sideNavReference,
    sideNavItemReference,
    tabReference,
    tabListReference,
    dialogReference,
    tableReference,
    tableColumnReference,
];

export const pageReferenceDocs = referenceModules.map(({ reference }) => reference);

export const pageReferenceDocPages = referenceModules.map(({ reference, content, metadata }) => ({
    path: `/docs/sdk/pages/${reference.slug}`,
    title: reference.name,
    description: reference.summary,
    icon: <FileCode2 aria-hidden="true" size={16} />,
    content,
    metadata,
}));

export const pageReferenceHrefByName = Object.fromEntries(
    pageReferenceDocPages.map(({ title, path }) => [title, path])
);
