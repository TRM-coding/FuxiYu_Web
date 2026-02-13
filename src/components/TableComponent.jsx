import React from 'react';
import { Table, Empty, Spin, Pagination } from 'antd';
import './TableComponent.css';

const TableComponent = ({ className = '', children, ...props }) => {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  const getCellValue = React.useCallback((record, dataIndex) => {
    if (!record || dataIndex === undefined || dataIndex === null) return undefined;
    if (Array.isArray(dataIndex)) {
      return dataIndex.reduce((acc, key) => (acc == null ? acc : acc[key]), record);
    }
    return record[dataIndex];
  }, []);

  const columns = React.useMemo(() => {
    return React.Children.toArray(children)
      .filter((child) => React.isValidElement(child) && child.props)
      .map((child) => ({
        key: child.key || child.props.key || child.props.dataIndex || child.props.title,
        title: child.props.title,
        dataIndex: child.props.dataIndex,
        render: child.props.render,
      }));
  }, [children]);

  const dataSource = Array.isArray(props.dataSource) ? props.dataSource : [];
  const rowKey = props.rowKey || 'key';
  const loading = !!props.loading;
  const pagination = props.pagination;
  const expandable = props.expandable;
  const expandedRowKeys = Array.isArray(expandable?.expandedRowKeys) ? expandable.expandedRowKeys : [];

  const paginationConfig = React.useMemo(() => {
    if (pagination === false) return null;
    if (pagination === true || pagination == null) return {};
    return typeof pagination === 'object' ? pagination : {};
  }, [pagination]);

  const defaultPageSize = Number(paginationConfig?.pageSize || paginationConfig?.defaultPageSize || 10) || 10;
  const [innerPage, setInnerPage] = React.useState(Number(paginationConfig?.defaultCurrent || 1) || 1);
  const [innerPageSize, setInnerPageSize] = React.useState(defaultPageSize);

  const currentPage = Number(paginationConfig?.current || innerPage) || 1;
  const currentPageSize = Number(paginationConfig?.pageSize || innerPageSize) || 10;

  React.useEffect(() => {
    if (!paginationConfig) return;
    if (paginationConfig.current == null && paginationConfig.defaultCurrent != null) {
      setInnerPage(Number(paginationConfig.defaultCurrent) || 1);
    }
  }, [paginationConfig]);

  React.useEffect(() => {
    if (!paginationConfig) return;
    if (paginationConfig.pageSize == null && paginationConfig.defaultPageSize != null) {
      setInnerPageSize(Number(paginationConfig.defaultPageSize) || 10);
    }
  }, [paginationConfig]);

  const getRowKey = React.useCallback((record, index) => {
    if (typeof rowKey === 'function') return rowKey(record);
    return record?.[rowKey] ?? index;
  }, [rowKey]);

  const totalForPagination = (paginationConfig && typeof paginationConfig.total === 'number')
    ? paginationConfig.total
    : dataSource.length;

  // client-side slice only when current data contains multiple pages
  const shouldSliceClient = !!paginationConfig && dataSource.length > currentPageSize;
  const pageStart = Math.max(0, (currentPage - 1) * currentPageSize);
  const pageEnd = pageStart + currentPageSize;
  const mobileDataSource = shouldSliceClient ? dataSource.slice(pageStart, pageEnd) : dataSource;

  const handleMobilePageChange = (page, pageSize) => {
    if (paginationConfig?.current == null) setInnerPage(page);
    if (paginationConfig?.pageSize == null) setInnerPageSize(pageSize);
    if (typeof paginationConfig?.onChange === 'function') {
      paginationConfig.onChange(page, pageSize);
    }
  };

  if (isMobile) {
    return (
      <div className={`app-table-mobile ${className}`.trim()}>
        <Spin spinning={loading}>
          {mobileDataSource.length === 0 ? (
            <div className="app-table-mobile-empty">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            <div className="app-table-mobile-list">
              {mobileDataSource.map((record, index) => {
                const cardKey = getRowKey(record, index);
                const rowProps = typeof props.onRow === 'function' ? props.onRow(record, index) || {} : {};
                const rowClass = typeof props.rowClassName === 'function'
                  ? (props.rowClassName(record, index) || '')
                  : (props.rowClassName || '');
                return (
                  <div
                    key={cardKey}
                    className={`app-table-mobile-card ${rowClass}`.trim()}
                    onClick={rowProps.onClick}
                  >
                    {columns.map((col, colIndex) => {
                      const rawValue = getCellValue(record, col.dataIndex);
                      const content = typeof col.render === 'function'
                        ? col.render(rawValue, record, index)
                        : (rawValue ?? '-');
                      const titleText = typeof col.title === 'string' ? col.title : '';
                      const keyText = String(col.key || '');
                      const isAction = /操作|action/i.test(titleText) || /action/i.test(keyText);
                      const isStats = /统计|stats/i.test(titleText) || /stats/i.test(keyText);
                      const plainValue = rawValue == null ? '' : String(rawValue);
                      const isShortPrimitive = (typeof rawValue === 'string' || typeof rawValue === 'number') && plainValue.length > 0 && plainValue.length <= 18;
                      const shortTitle = titleText.length > 0 && titleText.length <= 8;
                      const isCompact = !isAction && !isStats && !col.render && isShortPrimitive && shortTitle;
                      const itemCls = `app-table-mobile-item${isAction ? ' is-action' : ''}${isStats ? ' is-stats' : ''}${isCompact ? ' is-compact' : ''}`;
                      return (
                        <div key={`${cardKey}-${col.key || colIndex}`} className={itemCls}>
                          <div className="app-table-mobile-label">{col.title}</div>
                          <div className="app-table-mobile-value">{content}</div>
                        </div>
                      );
                    })}

                    {expandedRowKeys.some((k) => String(k) === String(cardKey)) && typeof expandable?.expandedRowRender === 'function' ? (
                      <div className="app-table-mobile-expanded">
                        {expandable.expandedRowRender(record, index)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Spin>

        {paginationConfig ? (
          <div className="app-table-mobile-pagination">
            <Pagination
              size="small"
              {...paginationConfig}
              current={currentPage}
              pageSize={currentPageSize}
              total={totalForPagination}
              onChange={handleMobilePageChange}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Table className={`app-table ${className}`} {...props}>
      {children}
    </Table>
  );
};

export default TableComponent;
