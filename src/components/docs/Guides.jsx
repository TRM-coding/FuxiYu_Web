import React from 'react';
import { Typography, Button, Tag, Checkbox, Radio, Select, Space } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

/** 真实页面（申请容器 / 我的容器）的按钮、弹窗、输入框逐项说明。
 *  按钮均用真实界面的同款控件渲染，并直接嵌入句子中提及该组件的位置，方便对照寻找。桌面与移动端通用。 */

const GuideItem = ({ title, children }) => (
  <div className="guide-item">
    <div className="guide-title">{title}</div>
    {children}
  </div>
);

/** 内容行：可选加粗标题 + 句子（句中的控件内嵌在提及处） */
const Field = ({ label, children }) => (
  <div className="guide-field">
    {label && <Text strong className="guide-field-label">{label}：</Text>}
    <Text className="guide-field-text">{children}</Text>
  </div>
);

/** 行内文字链接，与列表操作列中的 <a> 造型一致 */
const LinkBtn = ({ children, danger = false }) => (
  <Button type="link" size="small" danger={danger} style={{ padding: '0 6px' }}>
    {children}
  </Button>
);

/** 行内代码高亮：路径 / 密码 / 账号等技术内容 */
const Code = ({ children }) => <code className="guide-code">{children}</code>;

const DEVICE_TYPE_RADIO = (
  <Radio.Group
    size="small"
    optionType="button"
    defaultValue="Any"
    options={[
      { label: '任意', value: 'Any' },
      { label: 'CPU', value: 'CPU' },
      { label: 'GPU', value: 'GPU' },
    ]}
  />
);

const IMAGE_SELECT = (
  <Select
    size="small"
    defaultValue="ubuntu:24.04"
    style={{ width: 150 }}
    open={false}
    options={[{ value: 'ubuntu:24.04', label: 'ubuntu:24.04' }]}
  />
);

const CONTAINER_STATUS_TAGS = (
  <Space size={4} wrap>
    <Tag color="blue">创建中</Tag>
    <Tag color="cyan">启动中</Tag>
    <Tag color="green">运行中</Tag>
    <Tag color="orange">停止中</Tag>
    <Tag color="volcano">已停止</Tag>
    <Tag color="volcano">磁盘已冻结</Tag>
    <Tag color="red">异常</Tag>
  </Space>
);

const ROLE_TAGS = (
  <Space size={4}>
    <Tag color="red">超级管理员</Tag>
    <Tag color="blue">管理员</Tag>
    <Tag color="green">协作者</Tag>
  </Space>
);

/** 权限状态机示意图：三种角色 + 被移除，及各状态下的有效信息 */
const RoleFlow = () => (
  <div className="role-flow">
    <div className="role-flow-down">
      <span className="role-flow-arrows">↓</span>
      <span className="role-flow-label">添加新用户（可选择 协作者 / 管理员）</span>
    </div>

    <div className="role-flow-row">
      <div className="role-flow-box">
        <Tag color="green">协作者</Tag>
        <ul>
          <li>容器内独立账号，无 sudo</li>
          <li>家目录 <Code>/root/.collaborators/用户名</Code>（宿主机持久化挂载）</li>
          <li>初始密码 <Code>用户名+123</Code></li>
        </ul>
      </div>
      <div className="role-flow-mid">
        <span className="role-flow-arrows role-flow-arrows-h">⟷</span>
        <span className="role-flow-arrows role-flow-arrows-v">↕</span>
        <span className="role-flow-label">角色变更：加 / 删 sudo 组<br />（账号与数据不动）</span>
      </div>
      <div className="role-flow-box">
        <Tag color="blue">管理员</Tag>
        <ul>
          <li>独立账号 + sudo 组（可 sudo 提权）</li>
          <li>家目录、初始密码与协作者相同</li>
        </ul>
      </div>
    </div>

    <div className="role-flow-down">
      <span className="role-flow-arrows">↓</span>
      <span className="role-flow-label">转让：任意角色可提升为超级管理员，原超级管理员自动降为管理员</span>
    </div>

    <div className="role-flow-row role-flow-center">
      <div className="role-flow-box">
        <Tag color="red">超级管理员</Tag>
        <ul>
          <li>直接用容器内 <Code>root</Code> 账号登录，全权</li>
          <li><Code>root</Code> 密码改为 <Code>用户名+123</Code></li>
          <li>原独立账号删除，家目录归档 <Code>.legacy_用户名_时间戳</Code></li>
          <li>每个容器有且只有 1 个</li>
        </ul>
      </div>
    </div>

    <div className="role-flow-down">
      <span className="role-flow-arrows">↓</span>
      <span className="role-flow-label">移除 / 退出：任意角色均可被移出容器</span>
    </div>

    <div className="role-flow-row role-flow-center">
      <div className="role-flow-box">
        <Tag>被移除</Tag>
        <ul>
          <li>账号被删除，无法再登录</li>
          <li>家目录改名 <Code>.legacy_用户名_时间戳</Code> 归档在挂载目录，数据不删、可找回</li>
        </ul>
      </div>
    </div>
  </div>
);

export function ApplyGuide() {
  return (
    <div>
      <GuideItem title="① 机器列表">
        <Field label="设备类型">{DEVICE_TYPE_RADIO} 单选筛选机器列表</Field>
        <Field><LinkBtn>机器名称</LinkBtn> 是链接，点击打开「机器详细信息」弹窗</Field>
        <Field label="机器ID / IP地址">展示机器的标识与地址</Field>
        <Field label="机器类型">以 <Tag color="green">CPU</Tag> / <Tag color="volcano">GPU</Tag> 标签区分</Field>
        <Field label="机器状态"><Tag color="green">运行中</Tag> 可申请；<Tag color="orange">维护中</Tag> 与 <Tag color="volcano">已停止</Tag> 不可申请</Field>
        <Field><LinkBtn>查看</LinkBtn> 与机器名称一样打开「机器详细信息」弹窗</Field>
        <Field><LinkBtn>申请</LinkBtn> 仅机器状态为「运行中」时可点，打开「添加容器」弹窗；其余状态显示「不可用」</Field>
      </GuideItem>

      <GuideItem title="② 机器详情弹窗（点机器名称或「查看」打开）">
        <Field label="基本信息">状态、机器类型、CPU 核心数、内存 (GB)</Field>
        <Field label="配额上限">最大可分配 CPU / GPU / 内存、共享空间 (GB)，申请容器时不能超过这些值</Field>
        <Field label="其他信息">GPU 型号、磁盘 (GB)、机器描述、已建容器列表</Field>
        <Field><Button size="small">关闭</Button> 关闭弹窗，返回机器列表</Field>
      </GuideItem>

      <GuideItem title="③ 申请表单（点「申请」弹出的「添加容器」弹窗）">
        <Field label="上限提示">弹窗顶部提示「请不要超过宿主机算力/内存/共享空间上限。」；每个数值字段的标签都会标注该机器的上限（如 限: 16），超出时输入框会标红</Field>
        <Field label="容器名">给容器起的名字，创建后显示在「我的容器」列表中；必填，不超过 115 个字符，仅允许英文 / 数字 / 下划线</Field>
        <Field label="镜像地址">{IMAGE_SELECT} 容器使用的操作系统镜像，下拉选择</Field>
        <Field label="CPU 数量">分配给容器的 CPU 核数；最小 1，不能超过宿主机上限</Field>
        <Field label="内存 (GB)">容器的内存上限；最小 1，不能超过宿主机上限</Field>
        <Field label="请求 GPU 数量">分配给容器的 GPU 卡数；仅 GPU 机器显示，不能超过宿主机上限</Field>
        <Field label="共享空间 (GB)">容器内共享内存 <Code>/dev/shm</Code> 的大小，供容器内进程间通信使用；占用内存，因此不能大于所填内存</Field>
        <Field label="宿主机ID">只读，显示当前申请的目标机器</Field>
        <Field label="公钥（可选）">填入 SSH 公钥后，登录容器 root 账号无需密码（不超过 495 字符）；不填则使用密码登录</Field>
        <Field>点 <Button size="small">取消</Button> 关闭弹窗；点 <Button size="small" type="primary">添加</Button> 会先校验，通过后创建容器</Field>
      </GuideItem>

      <GuideItem title="④ 提交之后">
        <Field label="跳转">提示「容器创建请求已发送」，并自动进入「我的容器」页</Field>
        <Field label="状态变化">创建中 → 启动中 → 运行中；构建失败显示「异常」，删除后重新申请即可</Field>
      </GuideItem>
    </div>
  );
}

export function HomeGuide() {
  return (
    <div>
      <GuideItem title="① 容器列表">
        <Field label="顶部统计卡">总容器数 / 运行中 / 异常 / 离线 / 长期容器，仅作统计展示</Field>
        <Field><LinkBtn>容器名称</LinkBtn> 是链接，点击打开「容器详细信息」弹窗</Field>
        <Field label="容器ID / 机器 IP / 端口">展示容器标识、所在机器与 SSH 端口</Field>
        <Field label="容器状态">{CONTAINER_STATUS_TAGS} 含义与颜色见下方状态表</Field>
        <Field label="上次SSH登录">最近一次 SSH 登录时间；从未登录显示「从未登录」</Field>
        <Field label="距清理时间">距自动清理的倒计时（如 6天12小时）；SSH 登录一次重置 7 天；到期显示「可清理」；长期容器显示「长期容器」；被冻结的长期容器显示冻结天数与宽限</Field>
        <Field label="磁盘用量">已用 / 限额 (G) 与进度条；接近或超出限额时变黄、变红</Field>
      </GuideItem>

      <GuideItem title="② 操作按钮（列表每行，按角色显示不同按钮）">
        <Field><LinkBtn>启动</LinkBtn> 仅「已停止」可点（其余置灰）；点击直接启动，状态 启动中 → 运行中</Field>
        <Field><LinkBtn>重启</LinkBtn> 仅「运行中」可点；先弹确认框（提示高风险、可能中断运行任务），确认后执行</Field>
        <Field><LinkBtn danger>停止</LinkBtn> 仅「运行中」可点；先弹确认框（提示高风险、服务中断），确认后执行</Field>
        <Field><LinkBtn>刷新SSH</LinkBtn> 手动刷新上次 SSH 登录时间，从而重置清理倒计时；加载时显示「刷新中」</Field>
        <Field><Checkbox>长期容器</Checkbox> 仅超级管理员可见；勾选后不参与自动清理，每人限 1 个，名额用尽后置灰</Field>
        <Field><LinkBtn>查看详情</LinkBtn> 所有角色可见，打开容器详情弹窗</Field>
        <Field><LinkBtn>邀请</LinkBtn> 仅管理员可见；弹确认框，确认后发送加入邀请</Field>
        <Field><LinkBtn>删除容器</LinkBtn> 仅管理员可见；弹确认框（红字提示「此操作不可恢复！容器内所有数据将被永久删除」），点红色按钮 <Button size="small" danger>确认删除</Button> 才真正删除</Field>
        <Field><LinkBtn>退出</LinkBtn> 仅协作者可见；弹确认框，提示退出后需要管理员重新邀请才能加入</Field>
      </GuideItem>

      <GuideItem title="③ 容器详情弹窗（点容器名称或「查看详情」打开）">
        <Field label="基本信息">容器状态、所属机器 IP、镜像、端口映射</Field>
        <Field label="资源配置">CPU 核数、GPU 数量、内存 (GB)、共享 (GB)</Field>
        <Field label="用户权限">{ROLE_TAGS} 按角色分组列出成员；各角色在容器内的实际权限与数据影响见下文「⑤ 权限在容器内的实际影响」</Field>
        <Field label="磁盘冻结">状态为「磁盘已冻结」时，弹窗中显示提示「磁盘已冻结，请联系管理员解冻」</Field>
        <Field><Button size="small" danger icon={<DeleteOutlined />}>删除容器</Button> 仅超级管理员可见，进入删除确认流程</Field>
        <Field><Button size="small" icon={<DeleteOutlined />}>解除关联</Button> 非超级管理员可见，仅运行中可点；确认后该容器从「我的容器」中移除</Field>
        <Field><Button size="small" type="primary" icon={<EditOutlined />}>编辑用户</Button> 仅超级管理员可见，仅运行中可点，打开「编辑容器用户权限」弹窗</Field>
        <Field><Button size="small">关闭</Button> 关闭弹窗，返回列表</Field>
      </GuideItem>

      <GuideItem title="④ 编辑用户弹窗（详情中点「编辑用户」打开）">
        <Field><Button size="small" type="primary" icon={<PlusOutlined />}>添加用户</Button> 先在下拉中选择用户（显示姓名 @用户名）与角色（协作者 / 管理员），再点此按钮添加</Field>
        <Field label="当前用户列表">每行有角色下拉（协作者 / 管理员 / 超级管理员）与删除按钮；超级管理员行锁定，不可改角色、不可删除</Field>
        <Field label="角色变更">把某成员提升为超级管理员时，原超级管理员自动降为管理员（即转让）；每个容器必须至少有一个超级管理员</Field>
        <Field>点 <Button size="small">返回详情页</Button> 返回详情弹窗；点 <Button size="small" type="primary">完成</Button> 关闭弹窗</Field>
      </GuideItem>

      <GuideItem title="⑤ 权限在容器内的实际影响">
        <RoleFlow />
        <Field label="超级管理员 (ROOT)">使用容器内 <Code>root</Code> 账号登录（<Code>root</Code> 密码为该成员 <Code>用户名+123</Code>），拥有容器全部权限；每个容器有且只有 1 个</Field>
        <Field label="管理员 (ADMIN)">容器内独立账号，并加入 <Code>sudo</Code> 组（可 sudo 提权）</Field>
        <Field label="协作者 (COLLABORATOR)">容器内独立账号，无 <Code>sudo</Code> 权限</Field>
        <Field label="账号与密码">所有账号的初始密码均为 <Code>用户名+123</Code>，首次登录后请自行修改</Field>
        <Field label="家目录与挂载">容器的 <Code>/root</Code> 目录持久化挂载在宿主机上；每个成员的家目录都在 <Code>/root/.collaborators/用户名</Code> 下（软链 <Code>/home/用户名</Code>），数据随之保存在宿主机，容器删除后宿主机目录仍保留</Field>
        <Field label="移除与降级">成员被移除、或提升为超级管理员时，其原账号被删除，家目录改名为 <Code>.legacy_用户名_时间戳</Code> 归档在挂载目录中，数据不直接删除</Field>
        <Field label="转让超级管理员">把成员提升为超级管理员时，原超级管理员自动降为管理员，容器 <Code>root</Code> 密码改为新超级管理员的 <Code>用户名+123</Code></Field>
        <Field label="操作条件">添加 / 移除 / 变更角色都要求容器处于运行中、机器在线</Field>
      </GuideItem>

      <GuideItem title="⑥ 其他提示">
        <Field label="磁盘冻结">磁盘用量超限时容器变为「磁盘已冻结」，需联系管理员解冻，解冻后有宽限期</Field>
        <Field label="清理倒计时">SSH 登录一次重置 7 天；列表中的「刷新SSH」可手动同步登录时间</Field>
      </GuideItem>
    </div>
  );
}
