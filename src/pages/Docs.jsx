import React from 'react';
import { Tag, Typography, Table, Space, Alert, Button } from 'antd';
import {
  RocketOutlined,
  TeamOutlined,
  ToolOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import './DocsJourney.css';
// 状态词与产品界面同源：直接引页面状态映射，避免文档与 UI 各说各话
import { CONTAINER_STATUS_DISPLAY, MACHINE_STATUS_DISPLAY, getContainerStatusDisplay } from '../utils/statusDisplay';

const { Title, Text, Paragraph } = Typography;

// HashRouter 下 url hash 是路由地址，#锚点会被当成路径导致 404 ——
// 页内跳转一律用 scrollIntoView，不写 href 变更 hash
const scrollToHash = (event, id) => {
  event.preventDefault();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const TOC_ITEMS = [
  ['c-status', '状态卡'],
  ['c-card', '容器卡片'],
  ['c-role', '权限档位'],
  ['c-perm', '权限模型'],
  ['j-create', '第一次建容器'],
  ['j-day', '日常使用'],
  ['j-share', '与人共用'],
  ['faq', '常见问答'],
];

/* ───────────────── 概念数据 ───────────────── */

const CONTAINER_ORDER = [
  'building', 'creating', 'starting', 'online', 'stopping', 'offline',
  'restarting', 'paused', 'failed', 'status_unknown', 'host_offline', 'host_maintenance',
];

const CONTAINER_NOTES = {
  building: '正在宿主机上构建镜像，耐心等待。',
  creating: '镜像就绪，正在创建容器。',
  starting: '容器已拉起，正在确认 SSH 服务可用。',
  online: '可以 SSH 连接使用了。',
  stopping: '停止指令已发出。',
  offline: '容器未运行，点「启动」恢复。',
  restarting: '重启中，几秒后回到可用。',
  paused: '已冻结：磁盘超限自动冻结（只有长期容器承担磁盘上限）。清理数据后由平台管理员解冻。',
  failed: '创建或操作失败。可删除后重来。',
  status_unknown: '数据正在复核/对账（如宿主机刚重启）。稍等自动刷新即可。',
  host_offline: '宿主机与平台失联。等宿主机恢复；长时间离线请联系管理员。',
  host_maintenance: '宿主机处于维护模式，维护结束后恢复。',
};

const TEMPLATE_ROWS = [
  { key: 'draft', status: '草稿', color: 'default', meaning: '编辑中', note: '刚创建默认是草稿（除非创建时选了「可用」），还不开放给创建容器。' },
  { key: 'ready', status: '可用', color: 'green', meaning: '已开放', note: '普通用户创建容器时可选的模板。' },
  { key: 'disabled', status: '停用', color: 'red', meaning: '已下架', note: '不可再被选择。' },
];

const ROLE_ROWS = [
  { key: 'root', name: '超管ROOT', scope: '档位最高 · 容器创建者或接管者', note: '拥有容器内全部操作：启停、删除、邀请/移除成员、变更角色、设为长期。' },
  { key: 'admin', name: '管理员ADMIN', scope: '中间档位', note: '可启动/停止/重启、删除容器、设长期；成员管理（邀请/移除/改角色）只有 ROOT 能做。' },
  { key: 'collaborator', name: '协作者COLLABORATOR', scope: '基础档位', note: '可查看与 SSH 使用容器，不能操作启停、删除、改人；可从详情页退出。' },
];

const PERM_CARDS = [
  {
    title: '你能看到 / 操作什么 = 权限组权限点的并集',
    body: '新注册账号会自动加入 **user 组**（operator 账号走 operator 组）；管理端可再增绑其他权限组。界面里哪些入口可见、哪些按钮可点，取决于所绑各组**权限点**的合集。',
  },
  {
    title: 'manage = 该域的覆盖（override）',
    body: '某域的管理权限（如 machine:manage / rbac:manage）等于该域**全量 + 资源级通配**：持有者能看到并操作该域所有资源，不再被单条授权限制。',
  },
  {
    title: '资源级授权管的是“哪一台 / 哪个”',
    body: '机器权限、容器绑定、镜像授权解决的是**粒度**问题：谁能看这台机器、这个容器、这份模板。**授权之外默认不可见**。',
  },
];

const JOURNEYS = [
  {
    id: 'j-create',
    icon: <RocketOutlined />,
    title: '闭环一 · 第一次建出能用的容器',
    for: '任何想拥有一台可 SSH 环境的人',
    diagram: <CreateFlowSvg />,
    steps: [
      ['找到可用的机器与模板', '顶部「创建容器」：机器下拉里只出现**你被授权**的机器；模板选状态**「可用」**的即可，模板内容由模板维护者负责。'],
      ['填配置', '按需设置 CPU / 内存 / GPU 等。各机器有管理员设定的资源上限，页面会按上限约束可填范围。'],
      ['提交后等状态走完', '容器会依次经历 构建 → 创建 → 启动（见状态卡），到**「运行中」**就能用了。'],
      ['SSH 连接', '容器卡片上有地址（机器 IP : 端口）。初始密码为容器归属用户的**用户名+123**，首次登录后请尽快修改密码。', <PasswordCommandNote />],
      ['按钮与状态对应', '启动/停止/重启只在对应状态下可点；看到「启动中/停止中/重启中」这类过渡态时稍等即可。'],
    ],
  },
  {
    id: 'j-day',
    icon: <ToolOutlined />,
    title: '闭环二 · 日常使用与保持可用',
    for: '容器已经能用之后',
    steps: [
      ['闲置会被回收', '容器卡上有「上次 SSH」与「清理倒计时」：**普通容器没有磁盘上限**，长期不登录会被提醒、超期被回收——闲置回收就是它的容量出口。常用它，或考虑转长期。'],
      ['长期容器', '每人限 1 个：**不被闲置回收**，但由此承担**磁盘上限**——超限自动冻结，宽限期不整改会升级为清理。想长期保留，就要控制磁盘占用。'],
      ['被冻结', '「已冻结」= 磁盘超限（只有长期容器有磁盘上限）。先看提示原因、清理数据腾出空间，再联系平台管理员解冻；宽限期内不整改会升级为清理。'],
      ['状态异常时', '「状态未知」多在对账/复核期，稍后自动刷新即可；「宿主机离线/维护」是宿主机侧问题，长时间如此请联系管理员。'],
      ['不要了', '删除容器：容器停止运行，并从「我的容器」列表移除。',
        '数据**是会留的**——但是会**定期清理**，并且只保留 **root 目录**与**平台创建的协作者 home** 内容，所以尽量不要**手动 adduser**（自建账号的内容不在保留范围内）。误删后尽快联系管理员恢复哦~'],
    ],
  },
  {
    id: 'j-share',
    icon: <TeamOutlined />,
    title: '闭环三 · 与别人共用容器',
    for: '邀请别人 / 被邀请进别人的容器',
    steps: [
      ['被邀请后', '对方（ROOT）在容器详情里添加你，并给你 ADMIN 或 COLLABORATOR 档位，立刻生效：我的容器列表里会出现它。'],
      ['能做什么，看档位', 'COLLABORATOR：查看与 SSH 使用。ADMIN：还能启动/停止/重启、删除、设长期。成员管理（邀请/移除/改角色）**只有 ROOT 能做**（见概念卡·权限档位）。'],
      ['邀请别人（你是 ROOT 时）', '自己创建的容器你就是 ROOT：在容器详情里添加成员，按需给档位。'],
      ['退出 / 被移出', 'COLLABORATOR 与 ADMIN 可在详情里主动退出；被移出后失去访问权。'],
    ],
  },
];

const FAQ_ROWS = [
  ['为什么我看不到某台机器 / 某个用户 / 某模板？', '大概率是资源级授权：机器需要被授予「机器权限」，用户需要 user:manage 或被授权管理，模板需要授权行。没有对应 manage 权限时，列表只显示你被授权的那部分。'],
  ['容器显示「状态未知 / 宿主机离线」怎么办？', '「状态未知」多在宿主机重启后对账期，稍等自动刷新；「宿主机离线/维护」是宿主机侧问题，长时间如此请联系管理员。'],
  ['为什么新模板建出来是「草稿」？', '创建时不选状态则默认为草稿。想在创建时一步到位，直接选「可用」再保存。'],
  ['模板详情打不开 / 返回 403？', '详情含 Dockerfile 原文，只对模板授权者与 image:manage 开放。仅 view 权限时你可以看到列表并用它建容器，但看不到内部脚本。'],
  ['容器冻结后怎么恢复？', '冻结 = 磁盘超限自动触发（只有长期容器承担磁盘上限）。联系平台管理员解冻，并在宽限期内清理数据腾出空间，否则会升级为清理。'],
  ['长期容器可以设几个？', '每人限 1 个。规则是对称的：**普通容器**会被闲置回收，但没有磁盘上限；**长期容器**不被闲置回收，但有磁盘上限（超限冻结，宽限期不整改升级为清理）。'],
  ['教程怎么没讲管理端（机器/模板/权限/日志）？', '管理入口（用户管理、机器管理、权限管理、操作日志等）只在你持有对应权限时出现在菜单里；它们面向平台管理，不在此展开。界面术语与本文一致。'],
];

const { Column } = Table;

/** 正文中的 **xxx** 片段渲染为粗体（只在文案层做轻量强调，不做完整排版语法） */
const renderRich = (text) => {
  const parts = String(text).split('**');
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
};

const renderMaybeRich = (content) => (
  React.isValidElement(content) ? content : renderRich(content)
);

function PasswordCommandNote() {
  return (
    <span>
      登录容器后执行：
      <Text code copyable={{ text: 'passwd ' }}>{'passwd {你的新密码}'}</Text>
    </span>
  );
}

/* 创建页顺序示意图：三个虚线空区 + 编号 + 箭头（示意操作从上到下推进） */
function CreateFlowSvg() {
  const boxes = [
    { n: 1, x: 8, l1: '选择', l2: '机器与模板' },
    { n: 2, x: 218, l1: '填写', l2: '资源配置' },
    { n: 3, x: 428, l1: '提交并', l2: '等待就绪' },
  ];
  return (
    <figure className="jd-flow-figure">
      <svg viewBox="0 0 616 150" role="img" aria-label="创建容器三步顺序示意">
        {boxes.map((b) => (
          <g key={b.n}>
            <rect x={b.x} y={16} width={180} height={100} rx={12}
              fill="#fafafa" stroke="#d9d9d9" strokeDasharray="6 4" />
            <circle cx={b.x + 20} cy={36} r={11} fill="#e6f4ff" />
            <text x={b.x + 20} y={41} textAnchor="middle" fontSize={13} fontWeight={600} fill="#1677ff">{b.n}</text>
            <text x={b.x + 90} y={68} textAnchor="middle" fontSize={14} fill="#595959">{b.l1}</text>
            <text x={b.x + 90} y={88} textAnchor="middle" fontSize={14} fill="#595959">{b.l2}</text>
          </g>
        ))}
        <path d="M 196 66 H 210" stroke="#bfbfbf" strokeWidth={2} />
        <path d="M 210 60 l 10 6 -10 6 z" fill="#bfbfbf" />
        <path d="M 406 66 H 420" stroke="#bfbfbf" strokeWidth={2} />
        <path d="M 420 60 l 10 6 -10 6 z" fill="#bfbfbf" />
      </svg>
      <figcaption className="jd-fig-caption">创建页自上而下的三个区域：先选机器/模板，再填配置，最后提交等待状态变为「运行中」。</figcaption>
    </figure>
  );
}

/* 典型容器卡片示意：与真实卡片同构，抓读者最常问的元素 */
function DemoContainerCard() {
  const online = getContainerStatusDisplay('online');
  return (
    <div className="jd-demo-card">
      <Space size={8} wrap>
        <Text strong>ubuntu-环境 · dev</Text>
        <Tag color={online.color}>{online.label}</Tag>
      </Space>
      <Space size={6} wrap>
        <span className="jd-demo-chip">192.168.1.10:2222</span>
        <span className="jd-demo-chip">上次 SSH · 今天 09:12</span>
      </Space>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>清理倒计时</Text>
        <Text strong style={{ marginLeft: 8 }}>剩余 6 天</Text>
      </div>
      <div className="jd-demo-card-actions">
        <Space size={4} wrap>
          <Button size="small" type="primary" disabled>停止</Button>
          <Button size="small">重启</Button>
          <Button size="small" disabled>更多（启动/解冻等，随状态变化）</Button>
        </Space>
      </div>
    </div>
  );
}

function StatusTable({ rows, notes = {} }) {
  return (
    <Table
      className="jd-table"
      dataSource={rows}
      pagination={false}
      size="small"
      rowKey={(r) => r.key}
    >
      <Column title="状态" dataIndex="label" key="status" width={130}
        render={(label, r) => <Tag color={r.color}>{label}</Tag>} />
      <Column title="什么时候出现 / 含义" dataIndex="meaning" key="meaning" width={150} />
      <Column title="说明" key="note"
        render={(_, r) => <Text className="jd-note-line">{notes[r.key] || r.note || '—'}</Text>} />
    </Table>
  );
}

function JourneyCard({ journey }) {
  return (
    <section id={journey.id} className="jd-journey">
      <div className="jd-journey-head">
        <span className="jd-journey-icon">{journey.icon}</span>
        <div>
          <Title level={4} className="jd-journey-title">{journey.title}</Title>
          <Text type="secondary" className="jd-journey-for">适合：{journey.for}</Text>
        </div>
      </div>
      {journey.diagram ? <div className="jd-flow-figure-wrap">{journey.diagram}</div> : null}
      <ol className="jd-steps">
        {journey.steps.map(([title, desc, note], i) => (
          <li key={title} data-step={i + 1}>
            <div className="jd-step-title">{title}</div>
            <div className="jd-step-desc">{renderRich(desc)}</div>
            {note ? <div className="jd-step-small">{renderMaybeRich(note)}</div> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Docs() {
  const containerRows = CONTAINER_ORDER
    .filter((key) => CONTAINER_STATUS_DISPLAY[key])
    .map((key) => ({ key, ...CONTAINER_STATUS_DISPLAY[key] }));

  const machineRows = Object.entries(MACHINE_STATUS_DISPLAY).map(([key, meta]) => ({
    key,
    meaning: { online: '运行中', offline: '已停止', maintenance: '维护模式' }[key] || meta.label,
    note: key === 'online' ? '可对其上的容器进行操作。' : key === 'offline' ? '宿主机当前不可用（断连/关机），其上的容器不可操作。' : '维护期间容器管理操作会受限。',
    ...meta,
  }));

  return (
    <div id="top" className="jd-wrap">
      <Title level={2} className="jd-hero-title">使用说明</Title>
      <Paragraph type="secondary" className="jd-hero-sub">
        按任务闭环组织：先看概念卡（状态词、权限档位、权限模型），再走你要做的事。界面里的状态标签与本文完全同源；管理端功能按权限出现在菜单里，不在此展开。
      </Paragraph>

      <nav className="jd-toc">
        {TOC_ITEMS.map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={(e) => scrollToHash(e, id)}>{label}</a>
        ))}
      </nav>

      {/* ── 概念卡 ─────────────────────────── */}
      <section id="c-status" className="jd-journey">
        <Title level={4} className="jd-journey-title">概念卡 · 状态标签</Title>
        <Paragraph type="secondary">容器状态（与容器卡片上的彩色标签一一对应）：</Paragraph>
        <StatusTable rows={containerRows} notes={CONTAINER_NOTES} />

        <Paragraph type="secondary" style={{ marginTop: 14 }}>机器状态：</Paragraph>
        <StatusTable rows={machineRows} />

        <Paragraph type="secondary" style={{ marginTop: 14 }}>环境模板状态（编辑者在「环境模板」页维护）：</Paragraph>
        <StatusTable rows={TEMPLATE_ROWS} />
      </section>

      <section id="c-role" className="jd-journey">
        <Title level={4} className="jd-journey-title">概念卡 · 容器内的权限档位</Title>
        <Paragraph type="secondary">
          超管/管理员/协作者只是权限大小的称呼，不代表职业身份；同一个人在不同容器里的档位可以不同。以你在该容器的档位为准。
        </Paragraph>
        <div className="jd-concepts">
          {ROLE_ROWS.map((r) => (
            <div key={r.key} className="jd-concept-card">
              <h5>{r.name} <Text type="secondary">· {r.scope}</Text></h5>
              <p>{renderRich(r.note)}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="c-perm" className="jd-journey">
        <Title level={4} className="jd-journey-title">概念卡 · 权限怎么算</Title>
        <div className="jd-concepts">
          {PERM_CARDS.map((c) => (
            <div key={c.title} className="jd-concept-card">
              <h5>{c.title}</h5>
              <p>{renderRich(c.body)}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="c-card" className="jd-journey">
        <Title level={4} className="jd-journey-title">概念卡 · 典型容器卡片长这样</Title>
        <Paragraph type="secondary">
          在「我的容器」和管理页里你会反复看到这种卡片。高频疑问的位置先标出来：
        </Paragraph>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <DemoContainerCard />
          <ul className="jd-legend">
            <li><Text strong>状态标签</Text>：颜色与文案和上方状态卡一一对应（这里是「运行中」）。</li>
            <li><Text strong>地址</Text>：机器 IP : 端口，SSH 连接用。</li>
            <li><Text strong>上次 SSH / 清理倒计时</Text>：闲置回收的依据。普通容器会被闲置回收且无磁盘上限；长期容器不被回收、但有磁盘上限（超限冻结）。</li>
            <li><Text strong>操作按钮</Text>：随状态出现或禁用；点卡片本身进详情（成员管理、冻结原因等都在详情里）。</li>
          </ul>
        </div>
      </section>

      {/* ── 旅程 ───────────────────────────── */}
      {JOURNEYS.map((j) => <JourneyCard key={j.id} journey={j} />)}

      {/* ── FAQ ────────────────────────────── */}
      <section id="faq" className="jd-journey">
        <Title level={4} className="jd-journey-title"><QuestionCircleOutlined /> 常见问答</Title>
        <div className="jd-concepts" style={{ gridTemplateColumns: '1fr' }}>
          {FAQ_ROWS.map(([q, a]) => (
            <Alert key={q} type="info" showIcon message={<Text strong>{q}</Text>}
              description={a} style={{ borderRadius: 10 }} />
          ))}
        </div>
        <div className="jd-back-top">
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>返回顶部</a>
        </div>
      </section>
    </div>
  );
}
