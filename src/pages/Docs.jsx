import React from 'react';
import userGuide from '../content/USER_GUIDE_v1.md?raw';
import MarkdownGuide from '../components/docs/MarkdownGuide';

export default function Docs() {
  return <MarkdownGuide markdown={userGuide} />;
}
