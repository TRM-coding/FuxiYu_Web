import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import {
  history,
  historyKeymap,
  insertNewline,
  standardKeymap,
} from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { tags } from '@lezer/highlight';
import './MarkdownSourceEditor.css';

const PLACEHOLDER = '在此编写公告正文...\n\n点击右侧元素按钮直接在光标位置插入内容。';

const markdownHighlightStyle = HighlightStyle.define([
  {
    tag: [
      tags.heading1,
      tags.heading2,
      tags.heading3,
      tags.heading4,
      tags.heading5,
      tags.heading6,
    ],
    class: 'cm-md-heading',
  },
  { tag: tags.strong, class: 'cm-md-strong' },
  { tag: tags.emphasis, class: 'cm-md-emphasis' },
  { tag: [tags.link, tags.url], class: 'cm-md-link' },
  { tag: tags.monospace, class: 'cm-md-code' },
  { tag: tags.processingInstruction, class: 'cm-md-mark' },
  { tag: tags.quote, class: 'cm-md-quote' },
  { tag: tags.contentSeparator, class: 'cm-md-separator' },
  { tag: tags.labelName, class: 'cm-md-code-info' },
]);

const editorContentAttributes = EditorView.contentAttributes.of({
  'aria-label': '公告正文',
  'aria-multiline': 'true',
  role: 'textbox',
});

const editorKeymap = [
  Prec.high(keymap.of([
    { key: 'Enter', run: insertNewline },
    { key: 'Shift-Enter', run: insertNewline },
  ])),
  keymap.of([...historyKeymap, ...standardKeymap]),
];

const clampOffset = (offset, length) => Math.min(
  Math.max(Number.isFinite(Number(offset)) ? Number(offset) : length, 0),
  length,
);

const MarkdownSourceEditor = forwardRef(function MarkdownSourceEditor(
  { value = '', onChange },
  ref,
) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const extensionsRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const cachedSelectionRef = useRef(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const cacheSelection = (view) => {
      const main = view.state.selection.main;
      cachedSelectionRef.current = {
        anchor: main.anchor,
        head: main.head,
      };
    };

    const extensions = [
      history(),
      markdown({ addKeymap: false, completeHTMLTags: false }),
      syntaxHighlighting(markdownHighlightStyle),
      editorContentAttributes,
      EditorView.lineWrapping,
      placeholder(PLACEHOLDER),
      ...editorKeymap,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current?.(update.state.doc.toString());
        }
        if (update.selectionSet || update.focusChanged) {
          cacheSelection(update.view);
        }
      }),
      EditorView.domEventHandlers({
        blur(_event, view) {
          cacheSelection(view);
          return false;
        },
      }),
    ];
    extensionsRef.current = extensions;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions,
      }),
      parent: hostRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
      extensionsRef.current = null;
    };
  // The editor is created once. Parent value changes are reconciled below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;

    const length = value.length;
    const cached = cachedSelectionRef.current;
    const selection = cached
      ? {
        anchor: clampOffset(cached.anchor, length),
        head: clampOffset(cached.head, length),
      }
      : { anchor: length, head: length };

    if (cached) {
      cachedSelectionRef.current = { ...selection };
    }

    view.setState(EditorState.create({
      doc: value,
      selection,
      extensions: extensionsRef.current,
    }));
  }, [value]);

  useImperativeHandle(ref, () => ({
    insertText(text) {
      const view = viewRef.current;
      if (!view) return;

      const length = view.state.doc.length;
      const current = view.state.selection.main;
      const cached = cachedSelectionRef.current;
      const source = view.hasFocus
        ? { anchor: current.anchor, head: current.head }
        : (cached ?? { anchor: length, head: length });
      const anchor = clampOffset(source.anchor, length);
      const head = clampOffset(source.head, length);
      const from = Math.min(anchor, head);
      const to = Math.max(anchor, head);
      const insert = String(text ?? '');

      view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + insert.length },
        scrollIntoView: true,
        userEvent: 'input',
      });
      cachedSelectionRef.current = {
        anchor: from + insert.length,
        head: from + insert.length,
      };
      view.focus();
    },
    focus() {
      viewRef.current?.focus();
    },
  }), []);

  return <div ref={hostRef} className="markdown-source-editor" />;
});

export default MarkdownSourceEditor;
