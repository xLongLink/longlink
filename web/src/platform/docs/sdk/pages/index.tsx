import { FileCode2 } from 'lucide-react';
import { content as ifContent, metadata as ifMetadata } from './if';
import { content as forContent, metadata as forMetadata } from './for';
import { content as tabContent, metadata as tabMetadata } from './tab';
import { content as cardContent, metadata as cardMetadata } from './card';
import { content as gridContent, metadata as gridMetadata } from './grid';
import { content as iconContent, metadata as iconMetadata } from './icon';
import { content as linkContent, metadata as linkMetadata } from './link';
import { content as textContent, metadata as textMetadata } from './text';
import { content as badgeContent, metadata as badgeMetadata } from './badge';
import { content as queryContent, metadata as queryMetadata } from './query';
import { content as stackContent, metadata as stackMetadata } from './stack';
import { content as stateContent, metadata as stateMetadata } from './state';
import { content as tableContent, metadata as tableMetadata } from './table';
import { content as actionContent, metadata as actionMetadata } from './action';
import { content as avatarContent, metadata as avatarMetadata } from './avatar';
import { content as buttonContent, metadata as buttonMetadata } from './button';
import { content as dialogContent, metadata as dialogMetadata } from './dialog';
import { content as sliderContent, metadata as sliderMetadata } from './slider';
import { content as switchContent, metadata as switchMetadata } from './switch';
import { content as dividerContent, metadata as dividerMetadata } from './divider';
import { content as headingContent, metadata as headingMetadata } from './heading';
import { content as sideNavContent, metadata as sideNavMetadata } from './side-nav';
import { content as bindingsContent, metadata as bindingsMetadata } from './bindings';
import { content as selectorContent, metadata as selectorMetadata } from './selector';
import { content as textAreaContent, metadata as textAreaMetadata } from './text-area';
import { content as fileInputContent, metadata as fileInputMetadata } from './file-input';
import { content as radioListContent, metadata as radioListMetadata } from './radio-list';
import { content as textInputContent, metadata as textInputMetadata } from './text-input';
import { content as expressionsContent, metadata as expressionsMetadata } from './expressions';
import { content as numberInputContent, metadata as numberInputMetadata } from './number-input';
import { content as checkboxInputContent, metadata as checkboxInputMetadata } from './checkbox-input';
import { content as radioListItemContent, metadata as radioListItemMetadata } from './radio-list-item';
import { content as selectorOptionContent, metadata as selectorOptionMetadata } from './selector-option';

const pageReferences = [
    {
        name: 'if',
        slug: 'if',
        category: 'Runtime',
        summary: 'Conditionally renders an XML node when its expression evaluates to a truthy value.',
        content: ifContent,
        metadata: ifMetadata,
    },
    {
        name: 'Expressions',
        slug: 'expressions',
        category: 'Runtime',
        summary: 'Evaluates a safe JavaScript expression subset against the XML runtime scope.',
        content: expressionsContent,
        metadata: expressionsMetadata,
    },
    {
        name: 'Bindings',
        slug: 'bindings',
        category: 'Runtime',
        summary: 'Connects writable control values to State objects declared in the XML runtime.',
        content: bindingsContent,
        metadata: bindingsMetadata,
    },
    {
        name: 'State',
        slug: 'state',
        category: 'State',
        summary: 'Declares local reactive page state before the page renders.',
        content: stateContent,
        metadata: stateMetadata,
    },
    {
        name: 'Query',
        slug: 'query',
        category: 'State',
        summary: 'Fetches JSON data before rendering and stores it in the XML runtime scope.',
        content: queryContent,
        metadata: queryMetadata,
    },
    {
        name: 'Action',
        slug: 'action',
        category: 'State',
        summary: 'Provides request behavior to child triggers and refreshes selected runtime values.',
        content: actionContent,
        metadata: actionMetadata,
    },
    {
        name: 'For',
        slug: 'for',
        category: 'State',
        summary: 'Repeats child XML for every item in an array.',
        content: forContent,
        metadata: forMetadata,
    },
    {
        name: 'Button',
        slug: 'button',
        category: 'Action',
        summary: 'Renders a labeled command, submit trigger, or action trigger.',
        content: buttonContent,
        metadata: buttonMetadata,
    },
    {
        name: 'Link',
        slug: 'link',
        category: 'Action',
        summary: 'Navigates inside a LongLink Application or opens an external URL.',
        content: linkContent,
        metadata: linkMetadata,
    },
    {
        name: 'Card',
        slug: 'card',
        category: 'Layout',
        summary: 'Groups one discrete item on an Astryx surface.',
        content: cardContent,
        metadata: cardMetadata,
    },
    {
        name: 'Avatar',
        slug: 'avatar',
        category: 'Content',
        summary: 'Shows a user or team identity from an image or name.',
        content: avatarContent,
        metadata: avatarMetadata,
    },
    {
        name: 'Heading',
        slug: 'heading',
        category: 'Content',
        summary: 'Creates semantic section headings.',
        content: headingContent,
        metadata: headingMetadata,
    },
    {
        name: 'Icon',
        slug: 'icon',
        category: 'Content',
        summary: 'Displays a Lucide icon.',
        content: iconContent,
        metadata: iconMetadata,
    },
    {
        name: 'Text',
        slug: 'text',
        category: 'Content',
        summary: 'Renders paragraph, label, span, and supporting text content.',
        content: textContent,
        metadata: textMetadata,
    },
    {
        name: 'CheckboxInput',
        slug: 'checkbox-input',
        category: 'Form',
        summary: 'Captures one boolean value.',
        content: checkboxInputContent,
        metadata: checkboxInputMetadata,
    },
    {
        name: 'FileInput',
        slug: 'file-input',
        category: 'Form',
        summary: 'Collects browser File values for form actions.',
        content: fileInputContent,
        metadata: fileInputMetadata,
    },
    {
        name: 'NumberInput',
        slug: 'number-input',
        category: 'Form',
        summary: 'Collects numeric values.',
        content: numberInputContent,
        metadata: numberInputMetadata,
    },
    {
        name: 'RadioList',
        slug: 'radio-list',
        category: 'Form',
        summary: 'Presents one visible single-choice option group.',
        content: radioListContent,
        metadata: radioListMetadata,
    },
    {
        name: 'RadioListItem',
        slug: 'radio-list-item',
        category: 'Form',
        summary: 'Defines one option inside a RadioList.',
        content: radioListItemContent,
        metadata: radioListItemMetadata,
    },
    {
        name: 'Selector',
        slug: 'selector',
        category: 'Form',
        summary: 'Presents a dropdown selection control.',
        content: selectorContent,
        metadata: selectorMetadata,
    },
    {
        name: 'SelectorOption',
        slug: 'selector-option',
        category: 'Form',
        summary: 'Defines one option inside a Selector.',
        content: selectorOptionContent,
        metadata: selectorOptionMetadata,
    },
    {
        name: 'Slider',
        slug: 'slider',
        category: 'Form',
        summary: 'Captures bounded numeric values through a range control.',
        content: sliderContent,
        metadata: sliderMetadata,
    },
    {
        name: 'Switch',
        slug: 'switch',
        category: 'Form',
        summary: 'Captures an immediate on/off setting.',
        content: switchContent,
        metadata: switchMetadata,
    },
    {
        name: 'TextArea',
        slug: 'text-area',
        category: 'Form',
        summary: 'Collects longer text values.',
        content: textAreaContent,
        metadata: textAreaMetadata,
    },
    {
        name: 'TextInput',
        slug: 'text-input',
        category: 'Form',
        summary: 'Collects short text values.',
        content: textInputContent,
        metadata: textInputMetadata,
    },
    {
        name: 'Badge',
        slug: 'badge',
        category: 'Content',
        summary: 'Displays a compact status or enumerated label.',
        content: badgeContent,
        metadata: badgeMetadata,
    },
    {
        name: 'Divider',
        slug: 'divider',
        category: 'Layout',
        summary: 'Separates related regions with a rule.',
        content: dividerContent,
        metadata: dividerMetadata,
    },
    {
        name: 'Grid',
        slug: 'grid',
        category: 'Layout',
        summary: 'Creates fixed or responsive multi-column layouts.',
        content: gridContent,
        metadata: gridMetadata,
    },
    {
        name: 'Stack',
        slug: 'stack',
        category: 'Layout',
        summary: 'Arranges children vertically or horizontally.',
        content: stackContent,
        metadata: stackMetadata,
    },
    {
        name: 'SideNav',
        slug: 'side-nav',
        category: 'Layout',
        summary: 'Renders application navigation in a sidebar container.',
        content: sideNavContent,
        metadata: sideNavMetadata,
    },
    {
        name: 'Tab',
        slug: 'tab',
        category: 'Layout',
        summary: 'Defines one tab destination inside a TabList.',
        content: tabContent,
        metadata: tabMetadata,
    },
    {
        name: 'Dialog',
        slug: 'dialog',
        category: 'Layout',
        summary: 'Renders a modal workflow from one flat owner element.',
        content: dialogContent,
        metadata: dialogMetadata,
    },
    {
        name: 'Table',
        slug: 'table',
        category: 'Layout',
        summary: 'Displays tabular data from an array.',
        content: tableContent,
        metadata: tableMetadata,
    },
];

export const pageReferenceDocs = pageReferences.map(
    ({ content: _content, metadata: _metadata, ...reference }) => reference
);

export const pageReferenceDocPages = pageReferences.map(({ name, slug, summary, content, metadata }) => ({
    path: `/docs/sdk/pages/${slug}`,
    title: name,
    description: summary,
    icon: <FileCode2 aria-hidden="true" size={16} />,
    content,
    metadata,
}));

export const pageReferenceHrefByName = Object.fromEntries(
    pageReferenceDocPages.map(({ title, path }) => [title, path])
);
