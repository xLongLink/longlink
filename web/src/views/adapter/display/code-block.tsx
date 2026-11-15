import { viewComponent, type ViewProps } from '../props';
import * as code from '@/components/reui/code-block/code-block';

export const CodeBlock = viewComponent(code.CodeBlock);

export const CodeBlockContent = viewComponent(code.CodeBlockContent);

export const CodeBlockCopyButton = viewComponent(code.CodeBlockCopyButton);

export const CodeBlockDownloadButton = viewComponent(code.CodeBlockDownloadButton);

export const CodeBlockExpandButton = viewComponent(code.CodeBlockExpandButton);

export const CodeBlockHeader = viewComponent(code.CodeBlockHeader);

export const CodeBlockLanguage = viewComponent(code.CodeBlockLanguage);

export const CodeBlockLineActions = viewComponent(code.CodeBlockLineActions);

export const CodeBlockTitle = viewComponent(code.CodeBlockTitle);

export const CodeBlockWrapToggle = viewComponent(code.CodeBlockWrapToggle);

export type CodeBlockProps = ViewProps<code.CodeBlockProps>;

export type CodeBlockCopyButtonProps = ViewProps<code.CodeBlockCopyButtonProps>;

export type CodeBlockDownloadButtonProps = ViewProps<code.CodeBlockDownloadButtonProps>;

export type CodeBlockLineActionsProps = ViewProps<code.CodeBlockLineActionsProps>;

export type {
    CodeBlockFoldRegion,
    CodeBlockLine,
    CodeBlockLineSpec,
    CodeBlockThemes
} from '@/components/reui/code-block/code-block';
