import React from 'react';
import { Typography } from 'antd';
import './NestedEntityGrid.css';

const defaultGetKey = item => item?.key ?? item?.machine_id ?? item?.user_id ?? item?.id;
const defaultGetChildren = item => item?.containers ?? [];

const NestedEntityGrid = ({
  items = [],
  selectedKey = null,
  onSelect,
  getKey = defaultGetKey,
  getChildren = defaultGetChildren,
  renderRail,
  renderHeader,
  renderChild,
  renderFooter,
  renderEmptySlot,
  emptyText = '暂无数据',
  emptySlotText = '空位',
  className = '',
}) => {
  if (!items.length) {
    return <div className="fuxi-nested-empty">{emptyText}</div>;
  }

  return (
    <div className={`fuxi-nested-grid ${className}`}>
      {items.map(item => {
        const key = String(getKey(item));
        const children = getChildren(item) || [];
        const slots = [
          ...children.slice(0, 4),
          ...Array.from({ length: Math.max(0, 4 - children.length) }, () => null),
        ];
        const selected = selectedKey != null && String(selectedKey) === key;

        return (
          <article
            className={`fuxi-nested-entity-card ${selected ? 'fuxi-nested-entity-card-selected' : ''}`}
            key={key}
            onClick={onSelect ? () => onSelect(item) : undefined}
          >
            <aside className="fuxi-nested-entity-rail">
              {renderRail ? renderRail(item, children) : (
                <div>
                  <Typography.Text type="secondary">对象</Typography.Text>
                  <Typography.Title level={5}>{item?.name || key}</Typography.Title>
                </div>
              )}
            </aside>

            <section className="fuxi-nested-entity-main">
              <div className="fuxi-nested-entity-main-head">
                {renderHeader ? renderHeader(item, children) : (
                  <Typography.Text type="secondary">{children.length} 项</Typography.Text>
                )}
              </div>

              <div className="fuxi-nested-child-grid">
                {slots.map((child, index) => (
                  <React.Fragment key={child?.key || child?.container_id || `empty-${key}-${index}`}>
                    {child ? renderChild(child, item) : (
                      renderEmptySlot ? renderEmptySlot(item, index) : (
                        <div className="fuxi-nested-child-card fuxi-nested-child-card-empty">
                          <Typography.Text type="secondary">{emptySlotText}</Typography.Text>
                        </div>
                      )
                    )}
                  </React.Fragment>
                ))}
              </div>

              {renderFooter ? (
                <div className="fuxi-nested-entity-footer">
                  {renderFooter(item, children)}
                </div>
              ) : null}
            </section>
          </article>
        );
      })}
    </div>
  );
};

export default NestedEntityGrid;
