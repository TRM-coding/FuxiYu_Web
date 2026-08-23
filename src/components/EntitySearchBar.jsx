import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import './EntitySearchBar.css';

/**
 * 可复用双字段搜索条：两个关键字框取交集（AND），右侧可挂操作按钮。
 * 语义由 placeholder 承担，不再渲染标签（避免"白条式"的视觉噪音）。
 */
const EntitySearchBar = ({
  primaryLabel,
  primaryPlaceholder,
  primaryValue,
  onPrimaryChange,
  secondaryLabel,
  secondaryPlaceholder,
  secondaryValue,
  onSecondaryChange,
  actions = null,
  className = '',
}) => {
  return (
    <div className={`entity-search-bar ${className}`.trim()}>
      <Input
        className="entity-search-input"
        prefix={<SearchOutlined className="entity-search-icon" />}
        placeholder={primaryPlaceholder || primaryLabel}
        value={primaryValue}
        onChange={(event) => onPrimaryChange?.(event.target.value)}
        allowClear
      />
      <span className="entity-search-sep" title="两个条件取交集">AND</span>
      <Input
        className="entity-search-input"
        prefix={<SearchOutlined className="entity-search-icon" />}
        placeholder={secondaryPlaceholder || secondaryLabel}
        value={secondaryValue}
        onChange={(event) => onSecondaryChange?.(event.target.value)}
        allowClear
      />
      {actions ? <div className="entity-search-actions">{actions}</div> : null}
    </div>
  );
};

export default EntitySearchBar;
