import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Empty, Table } from 'antd';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import TableComponent from '../components/TableComponent';

const MOBILE_QUERY = '(max-width: 768px)';
const tableCss = readFileSync(path.resolve(process.cwd(), 'src/components/TableComponent.css'), 'utf8');

const records = [
  { id: 1, name: 'alpha', status: 'ok', path: '/home/alpha/containers/with space' },
  { id: 2, name: 'beta', status: 'fail', path: '/home/beta/containers' },
];

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '状态', dataIndex: 'status', key: 'status', render: value => <span>状态-{value}</span> },
  { title: '操作', key: 'action', render: (_, record) => <button type="button">详情-{record.id}</button> },
];

let originalMatchMedia;
let originalInnerWidth;

const setViewport = (mobile, width = 390) => {
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: mobile && String(query).includes(MOBILE_QUERY),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  window.innerWidth = width;
};

const ControlledTable = ({ onExpand = vi.fn(), initialKeys = [] }) => {
  const [keys, setKeys] = React.useState(initialKeys);
  return (
    <TableComponent
      columns={columns}
      dataSource={records}
      rowKey="id"
      pagination={false}
      expandable={{
        expandedRowKeys: keys,
        onExpandedRowsChange: setKeys,
        onExpand,
        expandedRowRender: record => <div>详情-{record.name}</div>,
      }}
    />
  );
};

const renderChildren = (props = {}) => render(
  <TableComponent dataSource={records} rowKey="id" pagination={false} {...props}>
    <Table.Column title="名称" dataIndex="name" key="name" />
    <Table.Column title="状态" dataIndex="status" key="status" render={value => <span>状态-{value}</span>} />
    <Table.Column title="操作" key="action" render={(_, record) => <button type="button">详情-{record.id}</button>} />
  </TableComponent>,
);

beforeEach(() => {
  originalMatchMedia = window.matchMedia;
  originalInnerWidth = window.innerWidth;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  window.innerWidth = originalInnerWidth;
  vi.restoreAllMocks();
});

describe('TableComponent 桌面与既有列定义兼容', () => {
  it('tc_table_01_desktop_children', () => {
    setViewport(false, 1440);
    renderChildren();

    expect(document.querySelector('table')).not.toBeNull();
    expect(screen.getByText('名称')).toBeInTheDocument();
    expect(screen.getByText('状态-ok')).toBeInTheDocument();
    expect(document.querySelector('.app-table')).not.toBeNull();
    expect(document.querySelector('.app-table-mobile-card')).toBeNull();
  });

  it('tc_table_02_desktop_columns', () => {
    setViewport(false, 1440);
    render(<TableComponent columns={columns} dataSource={records} rowKey="id" pagination={false} />);

    const headers = Array.from(document.querySelectorAll('th')).map(th => th.textContent.trim());
    expect(headers).toEqual(['名称', '状态', '操作']);
    expect(screen.getByRole('button', { name: '详情-1' })).toBeInTheDocument();
    expect(document.querySelector('.app-table-mobile-card')).toBeNull();
  });

  it('tc_table_03_empty_columns_data', () => {
    setViewport(false, 1440);
    render(<TableComponent columns={[]} dataSource={[]} rowKey="id" pagination={{ total: 21, pageSize: 10 }} />);

    expect(document.querySelector('table')).not.toBeNull();
    expect(document.querySelector('.app-table-mobile-card')).toBeNull();
    expect(document.querySelector('.ant-pagination')).not.toBeNull();
  });
});

describe('TableComponent 移动端卡片列渲染', () => {
  it('tc_table_19_rendered_long_target_is_not_compact', () => {
    setViewport(true, 390);
    render(<TableComponent rowKey="id" pagination={false} dataSource={[{ id: 1, target_id: 7 }]}
      columns={[{ title: '目标', dataIndex: 'target_id', key: 'target', render: () => <span>系统设置 very-long-target-name-without-spaces</span> }]} />);
    const field = screen.getByText('系统设置 very-long-target-name-without-spaces').closest('.app-table-mobile-item');
    expect(field).not.toHaveClass('is-compact');
  });

  it('tc_table_04_mobile_columns_cards', () => {
    setViewport(true, 390);
    render(<TableComponent columns={columns} dataSource={records} rowKey="id" pagination={false} />);

    expect(document.querySelectorAll('.app-table-mobile-card')).toHaveLength(2);
    expect(document.querySelector('table')).toBeNull();
    expect(screen.getAllByText('名称').length).toBe(2);
    expect(screen.getByText('状态-ok')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '详情-1' })).toBeInTheDocument();
  });

  it('tc_table_05_mobile_320_long_content', () => {
    setViewport(true, 320);
    const long = '/home/' + 'very-long-directory/'.repeat(8) + 'end';
    render(<TableComponent columns={columns} dataSource={[{ ...records[0], path: long }]} rowKey="id" pagination={false} />);

    expect(document.querySelectorAll('.app-table-mobile-card')).toHaveLength(1);
    expect(document.querySelector('.app-table-mobile-card')).toHaveTextContent('alpha');
    expect(tableCss).toMatch(/\.app-table-mobile-value\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  });

  it('tc_table_06_mobile_local_slice', () => {
    setViewport(true, 390);
    const localRecords = Array.from({ length: 25 }, (_, index) => ({
      id: index + 1,
      name: `name-${index + 1}`,
      status: 'ok',
    }));
    const onChange = vi.fn();
    const { rerender } = render(
      <TableComponent
        columns={columns}
        dataSource={localRecords}
        rowKey="id"
        pagination={{ current: 2, pageSize: 10, total: 25, onChange }}
      />,
    );

    expect(document.querySelectorAll('.app-table-mobile-card')).toHaveLength(10);
    expect(screen.getByText('name-11')).toBeInTheDocument();
    expect(screen.getByText('name-20')).toBeInTheDocument();
    expect(screen.queryByText('name-1')).toBeNull();
    expect(screen.queryByText('name-25')).toBeNull();
    fireEvent.click(document.querySelector('.ant-pagination-item-1'));
    expect(onChange).toHaveBeenCalledWith(1, 10);
    rerender(<TableComponent columns={columns} dataSource={localRecords} rowKey="id"
      pagination={{ current: 1, pageSize: 10, total: 25, onChange }} />);
    expect(document.querySelectorAll('.app-table-mobile-card')).toHaveLength(10);
    expect(screen.getByText('name-1')).toBeInTheDocument();
    expect(screen.getByText('name-10')).toBeInTheDocument();
    expect(screen.queryByText('name-11')).toBeNull();
    expect(screen.queryByText('name-25')).toBeNull();
  });

  it('tc_table_07_mobile_admin_fields_pagination', () => {
    setViewport(true, 390);
    render(
      <TableComponent
        dataSource={[{ id: 1, time: '2026-10-21', operator: 'root', operation: '更新机器', target: '机器 3', result: '成功' }]}
        rowKey="id"
        pagination={{ current: 1, pageSize: 20, total: 21 }}
      >
        <Table.Column title="时间" dataIndex="time" key="time" />
        <Table.Column title="操作人" dataIndex="operator" key="operator" />
        <Table.Column title="操作" dataIndex="operation" key="operation" />
        <Table.Column title="目标" dataIndex="target" key="target" />
        <Table.Column title="结果" dataIndex="result" key="result" />
      </TableComponent>,
    );

    expect(document.querySelectorAll('.app-table-mobile-card')).toHaveLength(1);
    expect(screen.getByText('操作人')).toBeInTheDocument();
    expect(screen.getByText('root')).toBeInTheDocument();
    expect(document.querySelector('.ant-pagination-item-2')).not.toBeNull();
  });

  it('tc_table_08_mobile_empty_pagination', () => {
    setViewport(true, 390);
    renderChildren({ dataSource: [], pagination: { current: 1, pageSize: 20, total: 21 } });

    expect(document.querySelector('.app-table-mobile-empty')).not.toBeNull();
    expect(document.querySelector('.ant-pagination-item-2')).not.toBeNull();
    expect(document.querySelectorAll('.app-table-mobile-card')).toHaveLength(0);
  });
});

describe('TableComponent 移动端受控展开', () => {
  it('tc_table_09_controlled_expand_collapse', () => {
    setViewport(true, 390);
    const onExpand = vi.fn();
    render(<ControlledTable onExpand={onExpand} />);

    const toggle = screen.getAllByRole('button', { name: '展开详情' })[0];
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: '收起详情' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('详情-alpha')).toBeInTheDocument();
    expect(onExpand).toHaveBeenLastCalledWith(true, records[0]);

    fireEvent.click(screen.getByRole('button', { name: '收起详情' }));
    expect(screen.queryByText('详情-alpha')).toBeNull();
    expect(onExpand).toHaveBeenLastCalledWith(false, records[0]);
  });

  it('tc_table_10_custom_expand_no_duplicate', () => {
    setViewport(true, 390);
    render(
      <TableComponent
        columns={columns}
        dataSource={records}
        rowKey="id"
        pagination={false}
        expandable={{
          expandedRowKeys: [1],
          onExpandedRowsChange: vi.fn(),
          showExpandColumn: false,
          expandedRowRender: record => <div>详情-{record.name}</div>,
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: '展开详情' })).toBeNull();
    expect(screen.getByText('详情-alpha')).toBeInTheDocument();
  });

  it('tc_table_11_missing_controlled_callback', () => {
    setViewport(true, 390);
    render(
      <TableComponent
        columns={columns}
        dataSource={records}
        rowKey="id"
        pagination={false}
        expandable={{
          expandedRowKeys: [],
          expandedRowRender: record => <div>详情-{record.name}</div>,
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: '展开详情' })).toBeNull();
  });
});

describe('TableComponent 移动端未受控展开', () => {
  it('tc_table_12_uncontrolled_admin_expand', () => {
    setViewport(true, 390);
    renderChildren({
      expandable: { expandedRowRender: record => <div>日志详情-{record.name}</div> },
    });

    fireEvent.click(screen.getAllByRole('button', { name: '展开详情' })[0]);
    expect(screen.getByText('日志详情-alpha')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '收起详情' }));
    expect(screen.queryByText('日志详情-alpha')).toBeNull();
  });

  it('tc_table_13_row_expandable_default', () => {
    setViewport(true, 390);
    renderChildren({
      expandable: { expandedRowRender: record => <div>详情-{record.name}</div> },
    });

    expect(screen.getAllByRole('button', { name: '展开详情' }).length).toBeGreaterThan(0);
  });

  it('tc_table_14_row_expandable_false', () => {
    setViewport(true, 390);
    renderChildren({
      expandable: {
        rowExpandable: record => record.id !== 2,
        expandedRowRender: record => <div>详情-{record.name}</div>,
      },
    });

    const buttons = screen.getAllByRole('button', { name: '展开详情' });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(screen.getByText('详情-alpha')).toBeInTheDocument();
    expect(screen.queryByText('详情-beta')).toBeNull();
  });
});

describe('TableComponent 移动端分页、空态与加载', () => {
  it('tc_table_15_pagination_page_two', () => {
    setViewport(true, 390);
    const onChange = vi.fn();
    renderChildren({ dataSource: [records[0]], pagination: { current: 1, pageSize: 20, total: 21, onChange } });

    fireEvent.click(document.querySelector('.ant-pagination-item-2'));
    expect(onChange).toHaveBeenCalledWith(2, 20);
  });

  it('tc_table_16_pagination_320_fit', () => {
    expect(tableCss).toMatch(/\.app-table-mobile-pagination\s*\{[^}]*flex-wrap:\s*wrap/s);
  });

  it('tc_table_17_empty_locale_description', () => {
    setViewport(true, 390);
    renderChildren({
      dataSource: [],
      pagination: { current: 1, pageSize: 20, total: 1 },
      locale: { emptyText: <Empty description="暂无已删除容器" /> },
    });

    expect(screen.getByText('暂无已删除容器')).toBeInTheDocument();
  });

  it('tc_table_18_loading_state', () => {
    setViewport(true, 390);
    renderChildren({ loading: true });

    expect(document.querySelector('.ant-spin-spinning')).not.toBeNull();
    expect(document.querySelectorAll('.app-table-mobile-card').length).toBeLessThanOrEqual(records.length);
  });
});
