/**
 * A lesson is a small, linear storyboard. Each step describes one visible
 * change: participants, the message (if any), and the packet's current form.
 * All sample addresses below are documentation-only examples.
 */
export const lessons = [
  {
    id: 'encapsulation',
    number: '01',
    category: '网络基础',
    title: '数据如何封装？',
    shortTitle: '分层封装',
    subtitle: '从应用数据到链路帧',
    summary: '跟着一段数据向下穿过协议栈，观察每层如何添加自己的控制信息。',
    duration: '约 2 分钟',
    icon: 'layers',
    principle: '发送端逐层添加首部；接收端按相反方向解析。不同链路上的帧首部可能不同。',
    assumption: '示意以 HTTP / TCP / IPv4 / 以太网为例，省略 TLS、分片与其他可选字段。',
    nodes: [
      { id: 'app', label: '应用层', detail: 'HTTP' },
      { id: 'transport', label: '传输层', detail: 'TCP' },
      { id: 'network', label: '网络层', detail: 'IPv4' },
      { id: 'link', label: '链路层', detail: 'Ethernet' },
    ],
    steps: [
      {
        title: '应用生成数据',
        eyebrow: '起点 · 应用层',
        description: '浏览器准备一条 HTTP 请求。此时我们关注的是应用消息本身，还没有添加下面各层的控制信息。',
        insight: '协议分层让应用不必亲自处理端口、路由和物理链路。',
        state: '应用消息已准备',
        from: 'app', to: null,
        message: 'GET / HTTP/1.1',
        segments: [{ label: 'HTTP 数据', type: 'data' }],
      },
      {
        title: '传输层添加 TCP 首部',
        eyebrow: '第 1 层封装 · TCP',
        description: 'TCP 在应用数据前加入首部，其中包含源端口、目的端口以及序号等信息。组成的数据单位称为 TCP 报文段。',
        insight: '端口号用于将收到的数据交给正确的应用进程。',
        state: 'TCP 报文段',
        from: 'app', to: 'transport',
        message: '源端口 → 目的端口 80',
        segments: [{ label: 'TCP 首部', type: 'tcp' }, { label: 'HTTP 数据', type: 'data' }],
      },
      {
        title: '网络层添加 IP 首部',
        eyebrow: '第 2 层封装 · IPv4',
        description: 'IP 首部写入源 IP、目的 IP 等信息，让网络能够把这个 IP 数据报送往目标主机。',
        insight: 'IP 地址负责主机间寻址；端口号负责主机内交付。',
        state: 'IP 数据报',
        from: 'transport', to: 'network',
        message: '192.0.2.10 → 203.0.113.10',
        segments: [{ label: 'IP 首部', type: 'ip' }, { label: 'TCP 首部', type: 'tcp' }, { label: 'HTTP 数据', type: 'data' }],
      },
      {
        title: '链路层组成帧',
        eyebrow: '第 3 层封装 · 以太网',
        description: '以太网在 IP 数据报外加入帧首部和帧校验序列，用于当前这一段链路的传输。',
        insight: '帧服务于一段链路；经过路由器后，链路层封装可能重新生成。',
        state: '以太网帧可发送',
        from: 'network', to: 'link',
        message: '下一跳 MAC → 帧传输',
        segments: [{ label: '帧首部', type: 'link' }, { label: 'IP 首部', type: 'ip' }, { label: 'TCP 首部', type: 'tcp' }, { label: 'HTTP 数据', type: 'data' }, { label: 'FCS', type: 'link' }],
      },
      {
        title: '接收端逐层解析',
        eyebrow: '终点 · 解封装',
        description: '目标主机收到帧后，从链路层向上检查并去掉对应封装，最终把 HTTP 数据交给应用。',
        insight: '发送时向下封装，接收时向上解析；中途路由器通常只需处理到网络层。',
        state: '数据到达应用',
        from: 'link', to: 'app',
        message: '帧 → IP → TCP → HTTP',
        segments: [{ label: 'HTTP 数据', type: 'data' }],
      },
    ],
  },
  {
    id: 'dns',
    number: '02',
    category: '应用层协议',
    title: '域名如何找到 IP？',
    shortTitle: 'DNS 查询',
    subtitle: '一次递归解析的旅程',
    summary: '沿着浏览器、递归解析器、根、顶级域和权威服务器追踪一次查询。',
    duration: '约 3 分钟',
    icon: 'globe',
    principle: '客户端向递归解析器发起查询；解析器在缓存未命中时，按委派关系逐步找到权威答案。',
    assumption: '把客户端与系统解析过程合并为“浏览器”节点，假设各级缓存均未命中。以 example.com 的 A 记录为例；203.0.113.10 是示意地址。省略 CNAME、DNSSEC 等情况。',
    nodes: [
      { id: 'browser', label: '浏览器', detail: '客户端' },
      { id: 'resolver', label: '递归解析器', detail: '代查答案' },
      { id: 'root', label: '根服务器', detail: '根区' },
      { id: 'tld', label: '.com 服务器', detail: '顶级域' },
      { id: 'auth', label: '权威服务器', detail: 'example.com' },
    ],
    steps: [
      { title: '发起域名查询', eyebrow: '查询 · 客户端', description: '浏览器需要 example.com 的 IPv4 地址，于是把 A 记录查询交给配置的递归解析器。', insight: '客户端通常把“查到最终答案”的工作交给递归解析器。', state: '等待解析', from: 'browser', to: 'resolver', message: 'example.com 的 A 记录？', segments: [{ label: 'DNS 查询', type: 'dns' }] },
      { title: '询问根服务器', eyebrow: '查询 · 根区', description: '递归解析器缓存未命中，向根服务器询问。根服务器负责指向 .com 顶级域服务器。', insight: '根服务器通常返回下一步该问谁，而非目标域名的最终 IP。', state: '寻找 .com', from: 'resolver', to: 'root', message: 'example.com 的 A 记录？', segments: [{ label: 'DNS 查询', type: 'dns' }] },
      { title: '得到顶级域指引', eyebrow: '委派 · 根区', description: '根服务器返回 .com 顶级域服务器的委派信息，解析器据此前往下一站。', insight: 'DNS 名称空间是一棵树，查询会沿委派关系逐级深入。', state: '已定位 .com', from: 'root', to: 'resolver', message: '请询问 .com 服务器', segments: [{ label: 'DNS 引荐', type: 'dns' }] },
      { title: '询问 .com 服务器', eyebrow: '查询 · 顶级域', description: '递归解析器向 .com 顶级域服务器询问 example.com 的记录。', insight: '顶级域服务器知道哪些权威服务器负责 example.com。', state: '寻找权威服务器', from: 'resolver', to: 'tld', message: 'example.com 的 A 记录？', segments: [{ label: 'DNS 查询', type: 'dns' }] },
      { title: '得到权威服务器指引', eyebrow: '委派 · 顶级域', description: '.com 服务器给出 example.com 的权威服务器信息。', insight: '引荐指向管理目标区域的服务器，本身不是最终地址答案。', state: '已定位权威服务器', from: 'tld', to: 'resolver', message: '请询问权威服务器', segments: [{ label: 'DNS 引荐', type: 'dns' }] },
      { title: '询问权威服务器', eyebrow: '查询 · 权威区', description: '递归解析器向 example.com 的权威服务器请求 A 记录。', insight: '权威服务器为自己管理的区域提供权威回答。', state: '获取地址记录', from: 'resolver', to: 'auth', message: 'example.com 的 A 记录？', segments: [{ label: 'DNS 查询', type: 'dns' }] },
      { title: '获得地址答案', eyebrow: '回答 · 权威区', description: '权威服务器返回示意 A 记录。解析器可按记录的 TTL 缓存这个结果。', insight: 'TTL 控制记录在缓存中可保留多久，并不保证所有缓存同时更新。', state: 'IP 已解析', from: 'auth', to: 'resolver', message: 'example.com → 203.0.113.10', segments: [{ label: 'A 记录', type: 'dns' }] },
      { title: '把结果交给浏览器', eyebrow: '回答 · 客户端', description: '递归解析器把结果返回浏览器，浏览器随后才可以使用这个地址继续建立连接。', insight: '拿到 IP 只是通信的准备步骤；后面还有连接和应用请求。', state: '可以连接目标', from: 'resolver', to: 'browser', message: '203.0.113.10', segments: [{ label: 'DNS 回答', type: 'dns' }] },
    ],
  },
  {
    id: 'tcp',
    number: '03',
    category: '传输层协议',
    title: 'TCP 为什么握三次手？',
    shortTitle: 'TCP 三次握手',
    subtitle: '从 SYN 到连接建立',
    summary: '观察双方如何交换初始序号，并确认彼此都具备收发能力。',
    duration: '约 2 分钟',
    icon: 'arrows',
    principle: '客户端发送 SYN，服务端回复 SYN+ACK，客户端再发送 ACK，双方建立连接。',
    assumption: '序号使用示例值，省略重传、选项协商、同时打开和中间网络设备。ACK 可以与之后的数据一起发送。',
    nodes: [
      { id: 'client', label: '客户端', detail: '浏览器' },
      { id: 'server', label: '服务端', detail: 'Web 服务器' },
    ],
    steps: [
      { title: '双方准备建立连接', eyebrow: '起点 · 连接未建立', description: '服务端处于监听状态，客户端准备发起 TCP 连接。双方尚未确认彼此的初始序号。', insight: 'TCP 是面向连接的协议，应用数据交换前通常需要先建立连接。', state: '客户端 CLOSED · 服务端 LISTEN', from: null, to: null, message: '等待连接请求', segments: [{ label: '尚无报文', type: 'muted' }] },
      { title: '客户端发送 SYN', eyebrow: '第 1 次握手', description: '客户端发送 SYN，告诉服务端自己的初始序号为 100，并进入 SYN-SENT 状态。', insight: 'SYN 用于同步序号；它会消耗一个序号。', state: '客户端 SYN-SENT', from: 'client', to: 'server', message: 'SYN · seq=100', segments: [{ label: 'TCP 首部', type: 'tcp' }, { label: 'SYN', type: 'signal' }] },
      { title: '服务端回复 SYN + ACK', eyebrow: '第 2 次握手', description: '服务端确认客户端序号，并发送自己的初始序号 500；确认号为 101，随后进入 SYN-RECEIVED。', insight: '一条报文同时完成对客户端 SYN 的确认和服务端序号的同步。', state: '服务端 SYN-RECEIVED', from: 'server', to: 'client', message: 'SYN, ACK · seq=500 · ack=101', segments: [{ label: 'TCP 首部', type: 'tcp' }, { label: 'SYN + ACK', type: 'signal' }] },
      { title: '客户端发送 ACK', eyebrow: '第 3 次握手', description: '客户端确认服务端的初始序号，发送 ack=501，并进入 ESTABLISHED 状态。', insight: '这次确认让服务端知道它发出的 SYN 已被客户端收到。', state: '客户端 ESTABLISHED', from: 'client', to: 'server', message: 'ACK · seq=101 · ack=501', segments: [{ label: 'TCP 首部', type: 'tcp' }, { label: 'ACK', type: 'signal' }] },
      { title: '连接建立完成', eyebrow: '终点 · 双方就绪', description: '服务端收到最后一个 ACK 后也进入 ESTABLISHED。现在双方可以在这条 TCP 连接上传输应用数据。', insight: '“三次”指三个握手报文，不是三个独立的连接。', state: '双方 ESTABLISHED', from: null, to: null, message: '双向传输已就绪', segments: [{ label: 'TCP 连接', type: 'signal' }] },
    ],
  },
  {
    id: 'http',
    number: '04',
    category: '应用层协议',
    title: '网页请求如何往返？',
    shortTitle: 'HTTP 往返',
    subtitle: '一次请求与一次响应',
    summary: '从浏览器发出 GET，到服务端返回状态码、首部和页面内容。',
    duration: '约 2 分钟',
    icon: 'window',
    principle: 'HTTP 采用请求与响应模型。客户端发送请求，服务端处理后返回状态、首部和可选的消息体。',
    assumption: '以已有 TCP 连接上的 HTTP/1.1 为例，省略 DNS、TLS、重定向、缓存、连接复用及页面子资源请求。',
    nodes: [
      { id: 'browser', label: '浏览器', detail: 'HTTP 客户端' },
      { id: 'server', label: 'Web 服务器', detail: 'HTTP 服务端' },
    ],
    steps: [
      { title: '连接已经就绪', eyebrow: '起点 · 前置条件', description: '浏览器已经知道服务器地址，并有一条可用的 TCP 连接。此处专注 HTTP 消息如何往返。', insight: '真实 HTTPS 请求通常还需要先完成 TLS 握手。', state: '等待请求', from: null, to: null, message: 'TCP 连接已建立', segments: [{ label: '连接就绪', type: 'muted' }] },
      { title: '浏览器发送 GET 请求', eyebrow: '请求 · 客户端 → 服务端', description: '浏览器请求根路径 /，并在 Host 首部中指出目标主机名 example.com。', insight: '方法和路径说明想做什么；请求首部提供上下文。', state: '请求已发送', from: 'browser', to: 'server', message: 'GET / HTTP/1.1 · Host: example.com', segments: [{ label: '请求行', type: 'http' }, { label: '请求首部', type: 'data' }] },
      { title: '服务器处理请求', eyebrow: '处理 · 服务端', description: '服务器根据方法、路径和配置查找资源，准备状态码、响应首部与页面内容。', insight: '不是每个响应都有消息体，例如 204 No Content。', state: '正在生成响应', from: 'server', to: null, message: '查找 / 对应的资源', segments: [{ label: '服务器处理', type: 'http' }] },
      { title: '返回 HTTP 响应', eyebrow: '响应 · 服务端 → 客户端', description: '服务器返回 200 OK，并附上 Content-Type 等首部和 HTML 消息体。', insight: '200 表示当前请求成功；浏览器还要根据消息体和首部处理结果。', state: '响应已收到', from: 'server', to: 'browser', message: 'HTTP/1.1 200 OK · text/html', segments: [{ label: '状态行', type: 'http' }, { label: '响应首部', type: 'data' }, { label: 'HTML', type: 'signal' }] },
      { title: '浏览器解析页面', eyebrow: '终点 · 客户端', description: '浏览器解析收到的 HTML 并开始呈现页面；实际页面通常还会请求 CSS、脚本和图片。', insight: '一次 HTTP 往返不等于完整页面加载。', state: '页面开始呈现', from: 'browser', to: null, message: 'HTML → 页面', segments: [{ label: '页面内容', type: 'signal' }] },
    ],
  },
];

export function getLesson(id) {
  return lessons.find((lesson) => lesson.id === id) ?? lessons[0];
}

export function clampStep(lesson, index) {
  return Math.max(0, Math.min(lesson.steps.length - 1, index));
}
