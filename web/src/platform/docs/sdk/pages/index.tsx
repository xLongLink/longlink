import { FileCode2 } from 'lucide-react';
import { createElement, type ComponentType } from 'react';
import type { ArticleMetadata } from '@/lib/pages';
import IfDocumentation, { metadata as ifMetadata } from './if';
import ForDocumentation, { metadata as forMetadata } from './for';
import TabDocumentation, { metadata as tabMetadata } from './tab';
import CardDocumentation, { metadata as cardMetadata } from './card';
import GridDocumentation, { metadata as gridMetadata } from './grid';
import IconDocumentation, { metadata as iconMetadata } from './icon';
import LinkDocumentation, { metadata as linkMetadata } from './link';
import TextDocumentation, { metadata as textMetadata } from './text';
import BadgeDocumentation, { metadata as badgeMetadata } from './badge';
import QueryDocumentation, { metadata as queryMetadata } from './query';
import StackDocumentation, { metadata as stackMetadata } from './stack';
import StateDocumentation, { metadata as stateMetadata } from './state';
import TableDocumentation, { metadata as tableMetadata } from './table';
import ActionDocumentation, { metadata as actionMetadata } from './action';
import AvatarDocumentation, { metadata as avatarMetadata } from './avatar';
import ButtonDocumentation, { metadata as buttonMetadata } from './button';
import DialogDocumentation, { metadata as dialogMetadata } from './dialog';
import SliderDocumentation, { metadata as sliderMetadata } from './slider';
import SwitchDocumentation, { metadata as switchMetadata } from './switch';
import DividerDocumentation, { metadata as dividerMetadata } from './divider';
import HeadingDocumentation, { metadata as headingMetadata } from './heading';
import SideNavDocumentation, { metadata as sideNavMetadata } from './side-nav';
import BindingsDocumentation, { metadata as bindingsMetadata } from './bindings';
import SelectorDocumentation, { metadata as selectorMetadata } from './selector';
import TextAreaDocumentation, { metadata as textAreaMetadata } from './text-area';
import FileInputDocumentation, { metadata as fileInputMetadata } from './file-input';
import RadioListDocumentation, { metadata as radioListMetadata } from './radio-list';
import TextInputDocumentation, { metadata as textInputMetadata } from './text-input';
import ExpressionsDocumentation, { metadata as expressionsMetadata } from './expressions';
import NumberInputDocumentation, { metadata as numberInputMetadata } from './number-input';
import CheckboxInputDocumentation, { metadata as checkboxInputMetadata } from './checkbox-input';
import RadioListItemDocumentation, { metadata as radioListItemMetadata } from './radio-list-item';
import SelectorOptionDocumentation, { metadata as selectorOptionMetadata } from './selector-option';

type PageReference = {
    Component: ComponentType;
    category: string;
    metadata: ArticleMetadata;
};

export const pageReferencePages = [
    {
        category: 'Runtime',
        Component: IfDocumentation,
        metadata: ifMetadata,
    },
    {
        category: 'Runtime',
        Component: ExpressionsDocumentation,
        metadata: expressionsMetadata,
    },
    {
        category: 'Runtime',
        Component: BindingsDocumentation,
        metadata: bindingsMetadata,
    },
    {
        category: 'State',
        Component: StateDocumentation,
        metadata: stateMetadata,
    },
    {
        category: 'State',
        Component: QueryDocumentation,
        metadata: queryMetadata,
    },
    {
        category: 'State',
        Component: ActionDocumentation,
        metadata: actionMetadata,
    },
    {
        category: 'State',
        Component: ForDocumentation,
        metadata: forMetadata,
    },
    {
        category: 'Action',
        Component: ButtonDocumentation,
        metadata: buttonMetadata,
    },
    {
        category: 'Action',
        Component: LinkDocumentation,
        metadata: linkMetadata,
    },
    {
        category: 'Layout',
        Component: CardDocumentation,
        metadata: cardMetadata,
    },
    {
        category: 'Content',
        Component: AvatarDocumentation,
        metadata: avatarMetadata,
    },
    {
        category: 'Content',
        Component: HeadingDocumentation,
        metadata: headingMetadata,
    },
    {
        category: 'Content',
        Component: IconDocumentation,
        metadata: iconMetadata,
    },
    {
        category: 'Content',
        Component: TextDocumentation,
        metadata: textMetadata,
    },
    {
        category: 'Form',
        Component: CheckboxInputDocumentation,
        metadata: checkboxInputMetadata,
    },
    {
        category: 'Form',
        Component: FileInputDocumentation,
        metadata: fileInputMetadata,
    },
    {
        category: 'Form',
        Component: NumberInputDocumentation,
        metadata: numberInputMetadata,
    },
    {
        category: 'Form',
        Component: RadioListDocumentation,
        metadata: radioListMetadata,
    },
    {
        category: 'Form',
        Component: RadioListItemDocumentation,
        metadata: radioListItemMetadata,
    },
    {
        category: 'Form',
        Component: SelectorDocumentation,
        metadata: selectorMetadata,
    },
    {
        category: 'Form',
        Component: SelectorOptionDocumentation,
        metadata: selectorOptionMetadata,
    },
    {
        category: 'Form',
        Component: SliderDocumentation,
        metadata: sliderMetadata,
    },
    {
        category: 'Form',
        Component: SwitchDocumentation,
        metadata: switchMetadata,
    },
    {
        category: 'Form',
        Component: TextAreaDocumentation,
        metadata: textAreaMetadata,
    },
    {
        category: 'Form',
        Component: TextInputDocumentation,
        metadata: textInputMetadata,
    },
    {
        category: 'Content',
        Component: BadgeDocumentation,
        metadata: badgeMetadata,
    },
    {
        category: 'Layout',
        Component: DividerDocumentation,
        metadata: dividerMetadata,
    },
    {
        category: 'Layout',
        Component: GridDocumentation,
        metadata: gridMetadata,
    },
    {
        category: 'Layout',
        Component: StackDocumentation,
        metadata: stackMetadata,
    },
    {
        category: 'Layout',
        Component: SideNavDocumentation,
        metadata: sideNavMetadata,
    },
    {
        category: 'Layout',
        Component: TabDocumentation,
        metadata: tabMetadata,
    },
    {
        category: 'Layout',
        Component: DialogDocumentation,
        metadata: dialogMetadata,
    },
    {
        category: 'Layout',
        Component: TableDocumentation,
        metadata: tableMetadata,
    },
] as const satisfies readonly PageReference[];

export const pageReferenceDocs = pageReferencePages.map(({ category, metadata }) => ({
    name: metadata.title,
    slug: metadata.path.slice('/docs/sdk/pages/'.length),
    path: metadata.path,
    category,
    summary: metadata.description,
}));

export const pageReferenceDocPages = pageReferencePages.map(({ Component, metadata }) => ({
    ...metadata,
    icon: createElement(FileCode2, { 'aria-hidden': true, size: 16 }),
    content: createElement(Component),
    metadata,
}));

export const pageReferenceHrefByName = Object.fromEntries(pageReferenceDocs.map(({ name, path }) => [name, path]));
