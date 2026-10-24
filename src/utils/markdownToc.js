import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

export const HEADING_ID_PREFIX = 'docs-';

const TOC_MIN_DEPTH = 1;
const TOC_MAX_DEPTH = 3;

const guideParser = unified().use(remarkParse).use(remarkGfm);

const walkMarkdown = (node, visitor) => {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'heading') visitor(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walkMarkdown(child, visitor);
  }
};

const headingText = (node) => {
  let text = '';

  const append = (current) => {
    if (!current || typeof current !== 'object') return;
    if (current.type === 'text' || current.type === 'inlineCode') {
      text += current.value || '';
      return;
    }
    if (current.type === 'image') {
      text += current.alt || '';
      return;
    }
    if (current.type === 'break') {
      text += ' ';
      return;
    }
    if (Array.isArray(current.children)) {
      for (const child of current.children) append(child);
    }
  };

  append(node);
  return text;
};

export const slugifyHeading = (text) => {
  const normalized = String(text ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, '-')
    .replace(/[^\p{L}\p{N}\p{M}\p{Pc}\p{Pd}]+/gu, '')
    .replace(/[\p{Pd}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'section';
};

const assignHeadingIds = (tree) => {
  const usedIds = new Set();
  const headings = [];

  walkMarkdown(tree, (node) => {
    const text = headingText(node);
    const baseId = `${HEADING_ID_PREFIX}${slugifyHeading(text)}`;
    let id = baseId;
    let suffix = 2;

    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    node.data = {
      ...(node.data || {}),
      hProperties: {
        ...(node.data?.hProperties || {}),
        id,
      },
    };
    headings.push({ id, depth: node.depth, text, node });
  });

  return headings;
};

const buildTree = (headings) => {
  const roots = [];
  const stack = [];

  for (const heading of headings) {
    const item = {
      id: heading.id,
      depth: heading.depth,
      text: heading.text,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) {
      stack.pop();
    }

    if (stack.length > 0) {
      stack[stack.length - 1].children.push(item);
    } else {
      roots.push(item);
    }
    stack.push(item);
  }

  return roots;
};

export const buildMarkdownToc = (markdown, options = {}) => {
  const minDepth = options.minDepth ?? TOC_MIN_DEPTH;
  const maxDepth = options.maxDepth ?? TOC_MAX_DEPTH;
  const tree = guideParser.parse(String(markdown ?? ''));
  const headings = assignHeadingIds(tree)
    .filter((heading) => heading.depth >= minDepth && heading.depth <= maxDepth);

  return buildTree(headings);
};

export function remarkGuideHeadings() {
  return (tree) => {
    assignHeadingIds(tree);
  };
}
