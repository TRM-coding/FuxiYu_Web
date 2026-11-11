import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { buildMarkdownToc, remarkGuideHeadings } from '../../utils/markdownToc';
import './MarkdownGuide.css';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
};

const focusAndScrollToHeading = (id) => {
  const heading = document.getElementById(id);
  if (!heading) return;

  try {
    heading.focus({ preventScroll: true });
  } catch {
    heading.focus();
  }
  heading.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
};

const stopTouchPropagation = (event) => {
  event.stopPropagation();
};

const hastText = (node) => {
  if (!node) return '';
  if (node.type === 'text') return node.value || '';
  if (Array.isArray(node.children)) return node.children.map(hastText).join('');
  return '';
};

const copyTextToClipboard = async (text) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard API may be unavailable outside a secure context; fall through.
    }
  }

  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.dataset.docsCopyFallback = '';
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    return document.execCommand('copy') === true;
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
};

const markdownHeading = (Tag) => {
  const Heading = (props) => {
    const headingProps = { ...props };
    delete headingProps.node;
    return <Tag {...headingProps} tabIndex={-1}>{props.children}</Tag>;
  };
  Heading.displayName = `Markdown${Tag.toUpperCase()}`;
  return Heading;
};

const ExternalLink = (props) => {
  const { href, children } = props;
  const external = /^(?:https?:)?\/\//i.test(href || '');
  const internalAnchor = typeof href === 'string' && href.startsWith('#');
  const linkProps = { ...props };
  delete linkProps.node;
  delete linkProps.href;
  delete linkProps.children;

  const handleClick = (event) => {
    if (!internalAnchor) return;
    event.preventDefault();
    let id = href.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // Keep the raw id if the href is not valid percent-encoding.
    }
    if (id) focusAndScrollToHeading(id);
  };

  return (
    <a
      href={href}
      {...linkProps}
      onClick={handleClick}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
};

const TableBlock = (props) => {
  const tableProps = { ...props };
  delete tableProps.node;
  delete tableProps.children;

  return (
    <div
      className="docs-table-scroll"
      role="region"
      aria-label="表格"
      tabIndex={0}
      onTouchStart={stopTouchPropagation}
      onTouchEnd={stopTouchPropagation}
    >
      <table {...tableProps}>{props.children}</table>
    </div>
  );
};

function CodeBlock({ node, children }) {
  const [copyStatus, setCopyStatus] = useState('idle');
  const resetTimerRef = useRef(null);
  const code = useMemo(() => hastText(node).replace(/\n$/, ''), [node]);

  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

  const handleCopy = async () => {
    const copied = await copyTextToClipboard(code);
    setCopyStatus(copied ? 'copied' : 'failed');
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopyStatus('idle'), 1800);
  };

  const label = copyStatus === 'copied' ? '已复制' : copyStatus === 'failed' ? '复制失败' : '复制代码';
  const visibleLabel = copyStatus === 'idle' ? '复制' : label;

  return (
    <div
      className="docs-code-block"
      onTouchStart={stopTouchPropagation}
      onTouchEnd={stopTouchPropagation}
    >
      <button type="button" className="docs-code-copy" aria-label={label} onClick={handleCopy}>
        {visibleLabel}
      </button>
      <pre className="docs-code-pre">{children}</pre>
      <span className="docs-code-status" role="status" aria-live="polite">
        {copyStatus === 'idle' ? '' : label}
      </span>
    </div>
  );
}

const MARKDOWN_COMPONENTS = {
  h1: markdownHeading('h1'),
  h2: markdownHeading('h2'),
  h3: markdownHeading('h3'),
  h4: markdownHeading('h4'),
  h5: markdownHeading('h5'),
  h6: markdownHeading('h6'),
  a: ExternalLink,
  table: TableBlock,
  pre: CodeBlock,
};

const countTocItems = (items) => items.reduce(
  (total, item) => total + 1 + countTocItems(item.children),
  0,
);

function TocList({ items, onNavigate, mobile = false }) {
  return (
    <ol className="docs-toc-list">
      {items.map((item) => (
        <li key={item.id} className="docs-toc-item" data-depth={item.depth}>
          <button
            type="button"
            className="docs-toc-button"
            aria-controls={item.id}
            onClick={() => onNavigate(item.id, mobile)}
          >
            {item.text}
          </button>
          {item.children.length > 0 ? (
            <TocList items={item.children} onNavigate={onNavigate} mobile={mobile} />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export default function MarkdownGuide({ markdown }) {
  const outline = useMemo(() => buildMarkdownToc(markdown), [markdown]);
  const tocCount = useMemo(() => countTocItems(outline), [outline]);
  const mobileTocRef = useRef(null);

  const handleNavigate = (id, fromMobile) => {
    if (!fromMobile) {
      focusAndScrollToHeading(id);
      return;
    }

    if (mobileTocRef.current) mobileTocRef.current.open = false;
    const schedule = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (callback) => setTimeout(callback, 0);
    schedule(() => focusAndScrollToHeading(id));
  };

  return (
    <div className="docs-page">
      <aside
        className="docs-toc docs-toc-desktop"
        aria-label="本页目录"
        onTouchStart={stopTouchPropagation}
        onTouchEnd={stopTouchPropagation}
      >
        <p className="docs-toc-title">本页目录</p>
        <nav aria-label="页内目录">
          <TocList items={outline} onNavigate={handleNavigate} />
        </nav>
      </aside>

      <details
        className="docs-toc-mobile"
        ref={mobileTocRef}
        onTouchStart={stopTouchPropagation}
        onTouchEnd={stopTouchPropagation}
      >
        <summary className="docs-toc-summary">
          <span>本页目录</span>
          <span className="docs-toc-count">{tocCount} 节</span>
        </summary>
        <nav aria-label="目录">
          <TocList items={outline} onNavigate={handleNavigate} mobile />
        </nav>
      </details>

      <article className="docs-article">
        <div className="docs-markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkGuideHeadings]}
            components={MARKDOWN_COMPONENTS}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
