# NetworkExpression · 网络原理可视化实验室

一个面向计算机网络原理学习者的中文交互式网站。通过逐步演示，让协议从静态定义变成能观察、能推演的过程。

## 项目目标

- 建立从网络分层到具体协议行为的连贯认知。
- 用节点、报文、方向和状态变化解释每一步，而不只是播放动画。
- 让学习者能自己控制节奏，并通过简短的知识提示复习关键概念。

## 目前包含的场景

| 场景 | 要回答的问题 | 交互重点 |
| --- | --- | --- |
| 分层封装 | 应用数据如何变成可传输的帧？ | 逐层观察首部与数据的组合 |
| DNS 查询 | 域名如何得到 IP 地址？ | 沿查询链观察请求与回答 |
| TCP 三次握手 | 为什么建立连接需要三次消息？ | 观察 SYN、SYN-ACK、ACK 与连接状态 |
| HTTP 往返 | 浏览器请求页面时发生了什么？ | 观察请求、服务端处理和响应 |
| ARP 地址解析 | 同一链路上如何从下一跳 IP 找到 MAC？ | 观察广播请求、单播应答与缓存 |
| DHCP 地址分配 | 新设备如何得到网络配置？ | 观察 Discover、Offer、Request、ACK |
| IPv4 路由转发 | 数据报如何跨越多个网段？ | 观察下一跳、TTL 和逐跳重新封帧 |
| ICMP Echo / ping | ping 怎样观察网络往返？ | 观察 Echo 请求、应答与 RTT |

每个场景都有步骤导航、参与者与报文可视化、当前步骤说明、演示假设和一道自测题。课程目录可按关键词和层级查找，概念速查可跳转到相关演示。完成场景和答对自测的记录保存在浏览器 `localStorage` 中，不会发送到服务器；清除站点数据后记录会消失。网站不提供真实流量抓取或网络仿真，示例地址与 RTT 均为教学示意。

## 本地运行

需要 Node.js 18 或更新版本，无需安装第三方依赖。

```bash
npm run dev
```

在浏览器打开 `http://localhost:4173`。运行检查：

```bash
npm test
```

## 项目结构

```text
.
├── AGENTS.md              # 项目目标与协作约定
├── README.md              # 使用说明与交付范围
├── index.html             # 页面入口
├── src/
│   ├── main.js            # 页面渲染与交互
│   ├── lessons.js         # 场景和步骤数据
│   ├── lessons-extended.js # 扩展场景数据
│   ├── learning.js        # 概念、自测、筛选与进度
│   └── styles.css         # 样式与响应式布局
├── scripts/
│   └── dev-server.js      # 本地静态服务器
└── tests/
    ├── lessons.test.js    # 场景数据校验
    ├── learning.test.js   # 自测与进度校验
    └── ui-smoke.test.js   # 播放器交互冒烟检查
```

## 内容参考

扩展场景依据 [ARP RFC 826](https://www.rfc-editor.org/info/rfc826/)、[DHCP RFC 2131](https://www.rfc-editor.org/info/rfc2131/)、[IPv4 路由器要求 RFC 1812](https://www.rfc-editor.org/info/rfc1812/) 和 [ICMP RFC 792](https://www.rfc-editor.org/info/rfc792/) 编写。页面会指出为教学目的省略的条件；RFC 定义和真实网络实现比示意步骤更丰富。

## 后续方向

可继续增加 TCP 可靠传输与拥塞控制、TLS、NAT、IPv6 等场景。新增内容应沿用同一场景数据格式，先核对协议条件，再设计交互和自测。
