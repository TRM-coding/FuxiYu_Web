import { act } from '@testing-library/react';
import { EditorView } from '@codemirror/view';

export const findEditorView = (element) => {
  const host = element?.closest?.('.cm-editor') ?? element?.querySelector?.('.cm-editor') ?? element;
  const view = EditorView.findFromDOM(host);
  if (!view) throw new Error('未找到 CodeMirror EditorView');
  return view;
};

export const replaceEditorText = (view, text) => {
  act(() => {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
      selection: { anchor: text.length },
      scrollIntoView: true,
      userEvent: 'input.type',
    });
  });
};

export const setEditorSelection = (view, anchor, head = anchor) => {
  act(() => {
    view.dispatch({
      selection: { anchor, head },
      scrollIntoView: true,
    });
  });
};
