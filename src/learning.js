import { glossary } from './glossary.js';
import { curriculumLessons } from './curriculum.js';

export const checkpoints = {
  ...Object.fromEntries(curriculumLessons.map(lesson => [lesson.id, lesson.quiz])),
  encapsulation: {
    question: 'IP 数据报经过路由器转发后，哪部分通常需要为新链路重新生成？',
    options: ['最终目的 IP 地址', '链路层帧封装', 'HTTP 请求方法'],
    answer: 1,
    explanation: '路由器为出接口重新封装链路帧；最终目的 IP 一般仍指向目标主机。',
  },
  dns: {
    question: '缓存未命中时，根 DNS 服务器通常先告诉递归解析器什么？',
    options: ['目标网页的 HTML', '目标的 TCP 端口', '相应顶级域服务器的委派信息'],
    answer: 2,
    explanation: '根服务器一般提供顶级域的引荐，解析器再沿委派关系继续查询。',
  },
  tcp: {
    question: '服务端发送 SYN + ACK 后，还需要第三次握手主要为了确认什么？',
    options: ['客户端已收到服务端的 SYN', 'DNS 查询已经完成', 'HTTP 响应已经到达'],
    answer: 0,
    explanation: '最后的 ACK 确认了服务端的初始序号，服务端据此进入已建立状态。',
  },
  http: {
    question: 'HTTP 响应中的 200 OK 表示什么？',
    options: ['TCP 连接已断开', '当前 HTTP 请求成功', '整个网页的所有资源均已加载'],
    answer: 1,
    explanation: '200 表示当前请求成功；页面可能还需下载其他资源。',
  },
  arp: {
    question: '向不同网段的目标发送 IPv4 数据报时，本机通常先解析谁的 MAC？',
    options: ['远端目标主机', '本地默认网关', '根 DNS 服务器'],
    answer: 1,
    explanation: '本机先把帧交给同一链路上的下一跳，即默认网关。',
  },
  dhcp: {
    question: '在初始 DHCP 地址分配中，客户端用哪条消息声明自己选择的提议？',
    options: ['DHCPDISCOVER', 'DHCPOFFER', 'DHCPREQUEST'],
    answer: 2,
    explanation: '客户端通过 DHCPREQUEST 指定选择的服务器与地址，等待 DHCPACK。',
  },
  routing: {
    question: '路由器转发 IPv4 数据报时，哪项通常逐跳变化？',
    options: ['TTL', '最终目的 IP', '应用层请求路径'],
    answer: 0,
    explanation: '每次转发会减少 TTL，防止数据报在路由环路中无限循环。',
  },
  icmp: {
    question: '一次 ping 没收到 Echo Reply，能直接断定目标主机已离线吗？',
    options: ['能，所有在线主机都必须回复', '不能，ICMP 可能被过滤或丢弃', '能，因为 ping 使用可靠的 TCP'],
    answer: 1,
    explanation: '过滤、拥塞、目标策略等都可能导致没有应答，需结合其他信息判断。',
  },
};

export const concepts = [
  ...glossary,
  { term: 'IP 地址', group: '网络层', definition: '用于在 IP 网络中标识接口并参与路由寻址；数据报用目的 IP 指向最终目标。', related: 'routing' },
  { term: 'MAC 地址', group: '链路层', definition: '以太网等链路中使用的硬件地址。发送一帧时，目的 MAC 指向当前链路上的下一跳。', related: 'arp' },
  { term: '默认网关', group: '网络层', definition: '主机找不到更具体路由时使用的下一跳，通常是一台连接其他网络的路由器。', related: 'routing' },
  { term: 'TTL', group: '网络层', definition: 'IPv4 首部中的生存时间字段。路由器转发时递减，避免数据报在环路里无限转发。', related: 'routing' },
  { term: '端口号', group: '传输层', definition: 'TCP 或 UDP 在主机内标识通信端点的数字，帮助把数据交给正确的应用。', related: 'tcp' },
  { term: 'RTT', group: '网络测量', definition: '往返时间：从发出请求到收到对应回复的总耗时，不等同于单程时延。', related: 'icmp' },
  { term: '广播域', group: '链路层', definition: '一条链路上可收到同一二层广播帧的设备范围；普通路由器不会转发这种广播帧。', related: 'arp' },
  { term: '地址租约', group: '应用层', definition: 'DHCP 在一定期限内分配给客户端使用的网络配置，客户端通常需要在到期前续租。', related: 'dhcp' },
  { term: 'DNS 缓存', group: '应用层', definition: '暂存已查询的 DNS 记录，以减少重复查询；缓存可用时间受到记录 TTL 等因素影响。', related: 'dns' },
  { term: 'ACK', group: '传输层', definition: 'TCP 确认标志及确认机制的一部分。确认号表示接收方下一步期望收到的序号。', related: 'tcp' },
];

export const lessonGroups = ['全部', '基础', '物理层', '链路层', '网络层', '传输层', '应用层'];

export function filterLessons(lessons, query = '', group = '全部') {
  const normalized = query.trim().toLocaleLowerCase();
  return lessons.filter((lesson) => {
    if (group !== '全部' && lesson.group !== group) return false;
    if (!normalized) return true;
    return [lesson.title, lesson.shortTitle, lesson.subtitle, lesson.summary, lesson.category, lesson.group, ...lesson.terms]
      .some((value) => value.toLocaleLowerCase().includes(normalized));
  });
}

export const progressKey = 'network-expression-progress-v1';

export function loadProgress(storage, validIds) {
  const empty = { completed: [], mastered: [] };
  try {
    const parsed = JSON.parse(storage?.getItem(progressKey) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return empty;
    const clean = (value) => Array.isArray(value)
      ? [...new Set(value.filter((id) => typeof id === 'string' && validIds.includes(id)))]
      : [];
    return { completed: clean(parsed.completed), mastered: clean(parsed.mastered) };
  } catch {
    return empty;
  }
}

export function recordProgress(progress, id, field) {
  if (!['completed', 'mastered'].includes(field) || progress[field].includes(id)) return progress;
  return { ...progress, [field]: [...progress[field], id] };
}

export function saveProgress(storage, progress) {
  try {
    storage?.setItem(progressKey, JSON.stringify(progress));
  } catch {
    // Private browsing or disabled storage must not stop the lesson player.
  }
}
