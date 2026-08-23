import React from 'react';
import { message } from 'antd';
import './CopyChip.css';

const CopyChip = ({
  value,
  children,
  className = '',
  size = 'small',
  tone = 'muted',
  block = false,
}) => {
  const text = value == null ? '' : String(value);
  const classes = [
    'fuxi-copy-chip',
    `fuxi-copy-chip-${size}`,
    `fuxi-copy-chip-${tone}`,
    block ? 'fuxi-copy-chip-block' : '',
    className,
  ].filter(Boolean).join(' ');

  const handleCopy = async (event) => {
    event.stopPropagation();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制');
    } catch (err) {
      message.error('复制失败');
    }
  };

  return (
    <button
      type="button"
      className={classes}
      onClick={handleCopy}
      title={text}
    >
      {children || text || '-'}
    </button>
  );
};

export default CopyChip;
