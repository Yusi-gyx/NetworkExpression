import { eventPaths } from './topology.js';
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const e = escapeHtml;
const device = type => type === 'router' ? '<circle r="23"/><path d="M-15-9h29m-5-5 5 5-5 5M15 9h-29m5-5-5 5 5 5"/>' : type === 'switch' ? '<rect x="-28" y="-17" width="56" height="34" rx="5"/><path d="M-19 5h7m5 0h7m5 0h7M-18-6h35"/>' : type === 'server' ? '<rect x="-19" y="-27" width="38" height="54" rx="4"/><path d="M-12-14h24M-12 0h24M-12 14h14"/>' : type === 'ap' ? '<rect x="-24" y="4" width="48" height="20" rx="5"/><path d="M0 4v-15M-22-16q22-23 44 0M-13-9q13-14 26 0"/>' : type === 'cloud' ? '<path d="M-27 17C-52 15-42-17-23-12C-19-39 20-36 25-14C51-17 48 17 29 17Z"/>' : '<rect x="-26" y="-22" width="52" height="34" rx="4"/><path d="M0 12v11M-17 23h34"/>';
export function renderTopology(lesson, step, selected, fit) {
  let {topology} = lesson;
  if(lesson.id==='dhcp' && step.title==='设备应用网络配置') topology={...topology,nodes:topology.nodes.map(node=>node.id==='client'?{...node,detail:'192.0.2.42 · 租约生效'}:node)};
  const compact=typeof window !== 'undefined' && window.innerWidth<=520 && !fit;
  if(compact) {
    const layouts={
      wire:{client:[100,80],server:[310,340]},
      lan:{client:[100,70],sw:[210,230],server:[315,70],peer:[315,400],router:[100,400]},
      dns:{client:[80,70],resolver:[265,70],router:[180,230],root:[325,225],tld:[310,410],auth:[80,410]},
      mesh:{client:[80,70],router:[255,70],r2:[80,240],r3:[255,300],server:[80,435]},
      nat:{client:[80,65],peer:[300,65],sw:[190,210],router:[90,370],server:[315,435]},
      mail:{client:[80,65],router:[270,65],resolver:[80,235],server:[270,275],peer:[80,430]},
      wan:{client:[85,65],sw:[285,65],peer:[80,220],router:[285,235],r2:[285,420],server:[80,420]},
    };
    const kind=lesson.kind ?? ({dns:'dns',arp:'lan',dhcp:'lan'}[lesson.id] ?? 'wan');
    const positions=layouts[kind]??(['vlan','wifi','lan6'].includes(kind)?layouts.lan:layouts.wan);
    topology={...topology,nodes:topology.nodes.map(node=>({...node,x:positions[node.id][0],y:positions[node.id][1]}))};
  }
  const paths = eventPaths(lesson,step);
  const byId = Object.fromEntries(topology.nodes.map(node=>[node.id,node]));
  const lines = topology.links.map(edge=>{
    const a=byId[edge.a],b=byId[edge.b];
    const broken=step.broken?.includes(a.id)&&step.broken?.includes(b.id);
    const wireless=topology.wireless?.some(pair=>pair.includes(a.id)&&pair.includes(b.id));
    return `<g class="${broken?'broken-link':''}"><line class="physical-link ${wireless?'wireless':''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>${edge.label?`<text class="link-label" x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2-10}">${e(edge.label)}</text>`:''}${broken?`<text class="loss-mark" x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2}">×</text>`:''}</g>`;
  }).join('');
  const painted=new Set();
  const transfers=paths.flatMap((path,pi)=>path.slice(1).map((id,i)=>{
    const key=`${path[i]}:${id}`; if(painted.has(key)) return ''; painted.add(key);
    const a=byId[path[i]],b=byId[id];
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),offset=34;
    const x1=a.x+dx/len*offset,y1=a.y+dy/len*offset,x2=b.x-dx/len*offset,y2=b.y-dy/len*offset;
    return `<path class="active-link ${step.dropped?'lost-transfer':''}" d="M${x1},${y1} L${x2},${y2}" marker-end="url(#${step.dropped?'loss':'arrow'}-head)"/><circle class="packet-dot" r="5" cx="${(x1+x2)/2}" cy="${(y1+y2)/2}" style="--delay:${i*0.25+pi*0.1}s"/>`;
  })).join('');
  const nodes=topology.nodes.map(node=>{
    const active=node.id===step.from||node.id===step.to||paths.some(path=>path.includes(node.id));
    return `<g role="button" tabindex="0" data-action="inspect" data-node="${node.id}" aria-label="查看${e(node.label)}：${e(node.detail)}" aria-pressed="${selected===node.id}" class="topology-node ${active?'active':''} ${selected===node.id?'selected':''}" transform="translate(${node.x} ${node.y})"><title>${e(node.label)} · ${e(node.detail)}</title><rect class="node-hit" x="-62" y="-35" width="124" height="96" rx="10"/><g class="device-symbol">${device(node.type)}</g><rect class="node-label-bg" x="-77" y="35" width="154" height="39" rx="3"/><text class="node-name" y="47">${e(node.label)}</text><text class="node-address" y="64">${e(node.detail)}</text>${step.dropped&&(node.id===step.to||(!step.to&&node.id===step.from))?'<text class="loss-mark" x="37" y="-22">×</text>':''}</g>`;
  }).join('');
  const routeText=paths.length?paths.map(path=>path.map(id=>byId[id].label).join(' → ')).join('；'): `${byId[step.from]?.label ?? '各设备'}内部状态变化 · 本步没有网络报文传输`;
  const focused=byId[selected];
  const role=focused?({router:'连接不同 IP 网络，按目的 IP 查表；转发时更新 TTL / Hop Limit，并为出链路重新封帧。',switch:'连接同一二层网络中的设备，依据 MAC 表转发帧；不会替主机建立端到端 TCP 连接。',host:'运行应用和完整协议栈；发送时向下封装，接收时向上解析。',server:'服务器也运行协议栈，在应用层提供服务；中间网络通过地址把报文交给它。',ap:'提供无线接入并桥接链路；无线 ACK 只确认这一跳。',cloud:'为简化画面合并的中间网络，连线代表可达路径，不是一根直连网线。'}[focused.type]):'';
  return `<div class="topology-toolbar"><span>${e(topology.name)}</span><button type="button" data-action="fit">${fit?'展开设备':'横向全图'}</button></div><div class="topology-scroll ${fit?'fit':''}" tabindex="0" role="region" aria-label="可横向滚动的网络拓扑"><svg class="topology-svg ${compact?'compact':''}" viewBox="0 0 ${compact?'420 520':'880 380'}" role="group" aria-label="${e(lesson.shortTitle)}网络拓扑"><defs><marker id="arrow-head" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#07796c"/></marker><marker id="loss-head" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#c04a31"/></marker><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#cbd5db"/></pattern></defs><rect width="880" height="520" fill="url(#grid)"/>${lines}${transfers}${nodes}</svg></div><div class="map-legend"><span><i></i>物理链路 / 合并路径</span><span><i class="active"></i>本步传输方向</span><span>× 丢弃 / 故障</span><span>点击设备查看职责</span></div><div class="route-readout"><strong>${paths.length>1?'本步的分支路径':'本步路径'}</strong><span>${e(routeText)}</span></div>${focused?`<div class="device-inspector"><strong>${e(focused.label)} · ${e(focused.detail)}</strong><p>${e(role)}</p></div>`:''}`;
}
export function renderDetail(lesson,step,index) {
  const rows=step.rows??[['当前状态',step.state],['报文 / 操作',step.message]];
  let graphic='';
  if(lesson.view==='stack') graphic=`<div class="stack-diagram" aria-label="设备内部协议栈">${['应用层 · HTTP / DNS','传输层 · TCP / UDP','网络层 · IP','链路层 · Ethernet','物理层 · 信号'].map((label,i)=>`<div class="stack-level ${4-i===step.stack?'current':''}"><span>${label}</span><small>${4-i===step.stack?'← 本步观察':''}</small></div>`).join('')}<p>发送 ↓ 封装　接收 ↑ 解封装<br>协议层位于设备内部，不是沿途设备。</p></div>`;
  if(lesson.view==='signal') graphic=`<div class="signal-view"><svg viewBox="0 0 480 105" role="img" aria-label="比特 ${step.bits} 的示意高低电平"><path class="signal-axis" d="M20 70H460"/><path class="signal-line" d="${(step.bits??'').split('').map((bit,i)=>`${i?'L':'M'}${30+i*52} ${bit==='1'?25:70}H${30+(i+1)*52}`).join(' ')}"/>${(step.bits??'').split('').map((bit,i)=>`<text x="${56+i*52}" y="97">${bit}</text>`).join('')}</svg></div>`;
  if(lesson.view==='window') graphic=`<div class="byte-window" aria-label="缓冲区或流的当前状态">${(step.cells??[]).map(cell=>`<div class="byte-cell ${/缺口|丢失|阻塞|等待/.test(cell)?'waiting':/确认|交付|补齐/.test(cell)?'delivered':''}"><strong>${e(cell.split(':')[0])}</strong><span>${e(cell.split(':')[1])}</span></div>`).join('')}</div>`;
  if(lesson.view==='bars') graphic=`<div class="bar-chart" role="img" aria-label="拥塞窗口依次为 ${(step.bars??[]).join('、')} MSS">${(step.bars??[]).map((value,i)=>`<div><span>${value}</span><i style="height:${value*18}px"></i><small>${i+1}</small></div>`).join('')}</div><p class="chart-caption">横轴：教学轮次快照 · 纵轴：cwnd / MSS</p>`;
  if(lesson.view==='sequence') {
    const events=lesson.steps.map((item,i)=>({item,i})).filter(({item})=>item.from&&item.to);
    const ids=[...new Set(events.flatMap(({item})=>[item.from,item.to]))];
    const width=Math.max(330,ids.length*130);
    const x=id=>45+ids.indexOf(id)*(width-90)/Math.max(1,ids.length-1);
    graphic=`<div class="sequence-scroll" tabindex="0" role="region" aria-label="报文时序，可横向滚动"><svg class="sequence-svg" viewBox="0 0 ${width} ${events.length*72+55}" style="min-width:${ids.length>2?width:0}px" role="group" aria-label="各参与者的报文时序，时间从上往下，非比例"><defs><marker id="seq-head" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#32866b"/></marker></defs>${ids.map(id=>`<text x="${x(id)}" y="15" text-anchor="middle" class="seq-node">${e(lesson.nodes.find(node=>node.id===id)?.label)}</text><line x1="${x(id)}" x2="${x(id)}" y1="28" y2="${events.length*72+45}" class="seq-life"/>`).join('')}${events.map(({item,i},row)=>`<g role="button" tabindex="0" data-action="step" data-step="${i}" aria-label="第 ${i+1} 步：${e(item.title)}" class="sequence-event ${i===index?'current':''} ${i>index?'future':''}"><rect x="0" y="${row*72+30}" width="${width}" height="68" rx="5"/><text x="${width/2}" y="${row*72+48}" text-anchor="middle" class="seq-label">${e(item.message.length>36?item.message.slice(0,34)+'…':item.message)}</text><line x1="${x(item.from)}" y1="${row*72+64}" x2="${x(item.to)}" y2="${row*72+64}" marker-end="url(#seq-head)"/><text x="${width/2}" y="${row*72+84}" text-anchor="middle" class="seq-note">${e(lesson.nodes.find(node=>node.id===item.from)?.label)} → ${e(lesson.nodes.find(node=>node.id===item.to)?.label)}</text><title>${e(item.message)}</title></g>`).join('')}</svg><small class="chart-caption">时间向下 ↓ · 点击报文跳转 · 淡色表示后续步骤</small></div>`;
  }

  return `<div class="detail-heading"><span>${{stack:'封装栈',signal:'信号波形',window:'字节 / 缓冲区',bars:'窗口变化',sequence:'报文时序',table:'设备状态表'}[lesson.view]??'状态观察'}</span><small>与当前步骤同步 · 数值为教学示意</small></div><div class="protocol-detail ${graphic?'with-graphic':''}">${graphic}<table class="state-table"><caption class="sr-only">${e(step.title)}的可观察状态</caption><thead><tr><th scope="col">观察项</th><th scope="col">当前值 / 结果</th></tr></thead><tbody>${rows.map(row=>`<tr><th scope="row">${e(row[0])}</th><td>${e(row[1])}</td></tr>`).join('')}</tbody></table></div>`;
}
