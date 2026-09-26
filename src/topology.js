// Topology describes physical devices, never protocol layers. Application messages
// traverse explicitly connected links; a local action has no transmission path.
const n = (id, label, detail, x, y, type = 'host') => ({ id, label, detail, x, y, type });
const link = (a, b, label = '') => ({ a, b, label });
export function createTopology(kind = 'wan') {
  if (kind === 'wire') return { name: '点到点链路 · 无中间设备', nodes: [n('client','发送主机','网卡 / 编码器',160,155), n('server','接收主机','网卡 / 解码器',660,155)], links: [link('client','server','介质 · 1,000 km')] };
  if (['lan','vlan','wifi','lan6'].includes(kind)) return {
    name: kind === 'vlan' ? '交换网络 · VLAN 10 与 VLAN 20' : kind === 'wifi' ? '无线接入 · 虚线为无线链路' : '以太网 LAN · 同一广播域',
    nodes: [n('client','主机 A',kind === 'lan6' ? '2001:db8:1::10' : kind === 'vlan' ? 'VLAN 10 · P1' : '192.0.2.10 · P1',110,145),n('sw',kind === 'wifi' ? '无线 AP' : '交换机','二层转发',370,145,kind === 'wifi' ? 'ap' : 'switch'),n('server','主机 B',kind === 'lan6' ? '2001:db8:1::20' : kind === 'vlan' ? 'VLAN 10 · P2' : '192.0.2.20 · P2',670,70),n('peer','主机 C',kind === 'vlan' ? 'VLAN 20 · P3' : '192.0.2.30 · P3',670,230),n('router','网关',kind === 'vlan' ? 'Trunk · P4' : '广播在此止步',370,280,'router')],
    links: [link('client','sw',kind === 'wifi' ? '无线共享介质' : 'P1'),link('sw','server','P2'),link('sw','peer','P3'),link('sw','router','P4')], wireless: kind === 'wifi' ? [['client','sw'],['sw','peer']] : [],
  };
  if (kind === 'dns') return {name:'DNS 服务部署 · 所有服务器经路由网络可达',nodes:[n('client','客户端','192.0.2.10',85,165),n('resolver','递归解析器','192.0.2.53',295,75,'server'),n('router','路由网络','合并中间设备',440,210,'cloud'),n('root','根服务器','返回 .com 委派',715,45,'server'),n('tld','.com 服务器','返回权威委派',715,170,'server'),n('auth','权威服务器','example.com',715,295,'server')],links:[link('client','resolver','本地网络'),link('resolver','router'),link('router','root'),link('router','tld'),link('router','auth')]};
  if (kind === 'mesh') return {name:'冗余拓扑 · 路由器 / 自治系统之间有多条路径',nodes:[n('client','源主机','192.0.2.10',75,155),n('router','A / AS 64512','本地选路',260,155,'router'),n('r2','B / AS 64513','中转',455,55,'router'),n('r3','C / AS 64514','目的网络入口',540,260,'router'),n('server','服务器','203.0.113.10',740,155,'server')],links:[link('client','router'),link('router','r2','代价 1'),link('r2','r3','代价 1'),link('router','r3','代价 5'),link('r3','server')]};
  if (kind === 'mail') return {name:'邮件服务部署 · 连线合并底层 IP 路径',nodes:[n('client','发件人','邮件客户端',80,150),n('router','提交 / 投递服务器','example.com',300,150,'server'),n('resolver','DNS 解析器','查询 MX 与地址',435,35,'server'),n('server','收件服务器','example.net',565,150,'server'),n('peer','收件人','IMAP 客户端',755,285)],links:[link('client','router'),link('router','resolver'),link('router','server'),link('server','peer')]};
  if (kind === 'nat') return {name:'私网 → NAPT 网关 → 外部服务',nodes:[n('client','内网主机','10.0.0.10',100,150),n('peer','另一台主机','10.0.0.20',100,290),n('sw','交换机','私有网络',320,150,'switch'),n('router','NAT 网关','10.0.0.1 / 198.51.100.1',540,150,'router'),n('server','Web 服务器','203.0.113.10',760,150,'server')],links:[link('client','sw'),link('peer','sw'),link('sw','router'),link('router','server','外网')]};
  return {name:'跨网段拓扑 · LAN → 路由器 A → 路由器 B → 服务器',nodes:[n('client','客户端','192.0.2.10 /24',85,150),n('sw','交换机','本地二层网络',265,150,'switch'),n('peer','同网段主机','192.0.2.20',265,285),n('router','路由器 A','192.0.2.1',455,150,'router'),n('r2','路由器 B','目的网络入口',625,150,'router'),n('server','服务器','203.0.113.10',790,150,'server')],links:[link('client','sw','LAN'),link('sw','peer'),link('sw','router'),link('router','r2','路由链路'),link('r2','server','目的网络')]};
}
export function findPath(topology, from, to) {
  if (!from || !to || from === to) return [];
  const queue = [[from]];
  const visited = new Set([from]);
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i];
    const last = path.at(-1);
    if (last === to) return path;
    for (const edge of topology.links) {
      const next = edge.a === last ? edge.b : edge.b === last ? edge.a : null;
      if (next && !visited.has(next)) { visited.add(next); queue.push([...path, next]); }
    }
  }
  return [];
}
export function eventPaths(lesson, step) {
  return step.routes ?? (step.from && step.to ? [findPath(lesson.topology, step.from, step.to)] : []);
}
const legacySources = {encapsulation:[1122,791],dns:[1034,1035],tcp:[9293],http:[9110,9112],arp:[826],dhcp:[2131],routing:[1812],icmp:[792]};
export function enrichLesson(lesson, index) {
  const mappings = {
    dns: {browser:'client'}, tcp: {}, http:{browser:'client'}, arp:{a:'client',lan:'sw',b:'server'},
    dhcp:{lan:'sw'},routing:{host:'client',r1:'router',target:'server'},icmp:{source:'client',target:'server'},
  };
  const kind = lesson.kind ?? ({dns:'dns',arp:'lan',dhcp:'lan'}[lesson.id] ?? 'wan');
  const topology = createTopology(kind);
  if (lesson.id === 'dhcp') {const server = topology.nodes.find(node=>node.id==='server');server.label='DHCP 服务器';server.type='server';server.detail='192.0.2.2 · 地址池';topology.nodes[0].detail='初始 0.0.0.0';}
  if (lesson.id === 'ospf') for(const [id,label] of [['router','路由器 A'],['r2','路由器 B'],['r3','路由器 C']]) topology.nodes.find(node=>node.id===id).label=label;
  if (kind === 'lan6') {topology.name='IPv6 本地链路 · NS 多播与 NA 应答';topology.nodes.find(node=>node.id==='peer').detail='2001:db8:1::30';topology.nodes.find(node=>node.id==='router').detail='fe80::1';}
  if (lesson.id === 'tcp') lesson={...lesson,assumption:'序号为示例值，省略重传、选项协商和同时打开。中间设备仅做转发，不参与 TCP 握手；最后的 ACK 可以携带数据。'};
  if (lesson.id === 'bgp') topology.links.forEach(edge=>{edge.label='';});
  const map = id => mappings[lesson.id]?.[id] ?? id;
  let steps = lesson.steps.map(step => ({...step,from: map(step.from),to:map(step.to)}));
  if (lesson.id === 'arp') {
    steps[1] = {...steps[1],to:'server',routes:[['client','sw','server'],['client','sw','peer'],['client','sw','router']],rows:[['目的 MAC','ff:ff:ff:ff:ff:ff'],['目标 IP','192.0.2.20'],['网关','收到后不向其他网段转发']]};
    steps[2] = {...steps[2],from:'server',to:null,rows:[['主机 B','目标 IP 匹配，准备回复'],['主机 C / 网关','目标 IP 不匹配，不回复']]};
    steps[0].rows=[['主机 A 的 ARP 缓存','192.0.2.20 → 未知']];
    steps[3].rows=[['ARP 应答','192.0.2.20 → 02:00:00:00:00:20']];
    steps[4].rows=[['主机 A 的 ARP 缓存','192.0.2.20 → 02:00:00:00:00:20'],['目的 MAC','02:00:00:00:00:20']];
  }
  if (lesson.id === 'dhcp') {
    lesson = {...lesson, assumption:'同一广播域中一台客户端、一台 DHCP 服务器，无中继。客户端能在配置前接收按 MAC 发送的单播，广播标志设为 0；本例 Offer/ACK 使用链路单播，Discover/初始 Request 广播。省略地址冲突检测和续租。'};
    steps = steps.map((step,i)=>({...step,rows:[['客户端状态',step.state],['传输协议','UDP · 客户端 68 / 服务器 67'],['地址租约',i === steps.length-1 ? '192.0.2.42 · 已配置' : '等待确认']]}));
    for(const i of [1,3]) steps[i]={...steps[i],routes:[['client','sw','server'],['client','sw','peer'],['client','sw','router']]};
  }
  if (lesson.id === 'encapsulation') {
    steps = steps.slice(0,4).map((step,i)=>({...step,from:'client',to:null,stack:4-i,rows:[['处理设备','客户端本地协议栈'],['数据单位',step.state]]}));
    const extra=(title,from,to,message,description,stack,segments)=>({title,from,to,message,description,stack,segments,eyebrow:'跨链路 → 解封装',insight:'协议层在设备内部工作；线上的帧只发往当前链路的下一跳。',state:message,rows:[['处理位置',from==='client'?'源主机':from==='router'?'路由器 A':from==='r2'?'路由器 B':'服务器'],['可见变化',message]]});
    steps.push(extra('把完整帧交给网关','client','router','帧 A · 目的 MAC 是网关','交换机按 MAC 转发到网关；IP 目的仍为 203.0.113.10。',0,steps[3].segments));
    steps.push(extra('路由器 A 重新封帧','router','r2','帧 B · TTL 减少','路由器去掉入链路帧，检查 IP、递减 TTL，再生成出链路帧；不终止端到端 TCP。',2,[{label:'新帧首部 B',type:'link'},...steps[2].segments,{label:'新 FCS',type:'link'}]));
    steps.push(extra('路由器 B 送入目的链路','r2','server','帧 C · 目的 MAC 是服务器','第二台路由器再次递减 TTL 并重新封帧，这次下一跳就是服务器。',2,[{label:'新帧首部 C',type:'link'},...steps[2].segments,{label:'新 FCS',type:'link'}]));
    steps.push(extra('服务器向上解封装','server',null,'帧 → IP → TCP → HTTP','服务器逐层解析并交给应用；这一步发生在同一台设备内部，没有新的网络传输。',4,[{label:'HTTP 数据',type:'data'}]));
  }
  if (lesson.id === 'routing') steps=steps.map((step,i)=>({...step,rows:[['目的前缀',i<2?'0.0.0.0/0':'203.0.113.0/24'],['下一跳',i<2?'192.0.2.1':i===2?'路由器 B':i===3?'直连目标':'本地交付'],['目的 IP','203.0.113.10'],['TTL',i<2?'3':i===2?'2':'1']]}));
  if (lesson.id === 'dns') steps=steps.map((step,i)=>({...step,rows:[['解析器缓存',i<6?'example.com A → 未命中':'example.com A → 203.0.113.10'],['当前任务',step.state]]}));
  if (lesson.id === 'tcp') steps=steps.map((step,i)=>({...step,rows:[['客户端',['CLOSED','SYN-SENT','收到 SYN+ACK 后可建立','ESTABLISHED','ESTABLISHED'][i]],['服务端',['LISTEN','收到后准备 SYN+ACK','SYN-RECEIVED','收到最后 ACK 后建立','ESTABLISHED'][i]]]}));
  const sources=lesson.sources ?? legacySources[lesson.id]?.map(id=>({label:`RFC ${id}`,url:`https://www.rfc-editor.org/rfc/rfc${id}.html`})) ?? [];
  return {...lesson,number:String(index+1).padStart(2,'0'),topology,nodes:topology.nodes,steps,sources,view:lesson.view ?? ({encapsulation:'stack',tcp:'sequence',http:'sequence',dns:'table',arp:'table',dhcp:'table',routing:'table',icmp:'sequence'}[lesson.id]),terms:lesson.terms??[]};
}
