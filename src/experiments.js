import { getLesson } from './lessons.js';
const localStep = (base, patch) => ({...base,...patch});
export const experimentOptions = {
  routing: [{id:'default',label:'初始 TTL = 3 · 可以到达'}, {id:'ttl-one',label:'初始 TTL = 1 · 在网关过期'}],
  reliability: [{id:'default',label:'第一段丢失 · 观察超时重传'}, {id:'no-loss',label:'没有丢失 · 对照正常确认'}],
  cache: [{id:'default',label:'源站内容未变 · 304'}, {id:'changed',label:'源站内容已变 · 200 + 新消息体'}],
};
export function getExperimentLesson(id, mode='default') {
  const lesson=getLesson(id);
  if(id==='routing'&&mode==='ttl-one') {
    const steps=[
      localStep(lesson.steps[0],{state:'初始 TTL = 1',rows:[['初始 TTL','1'],['下一跳','192.0.2.1']]}),
      localStep(lesson.steps[1],{state:'TTL = 1',message:'帧交给网关 · IP TTL=1',segments:[{label:'IP · TTL 1',type:'ip'}],rows:[['到达网关时 TTL','1'],['目的 IP','203.0.113.10']]}),
      localStep(lesson.steps[2],{title:'TTL 将耗尽，丢弃原包',from:'router',to:null,dropped:true,message:'TTL 1 → 0 · 不再转发',description:'网关要继续转发时，TTL 将归零，因此丢弃原数据报。路由器 B 与服务器均不会收到这份原包。',insight:'TTL 保护网络免受无限转发影响，丢弃不表示路由器自己发生故障。',state:'原数据报已丢弃',segments:[{label:'TTL = 0 · 丢弃',type:'ip'}],rows:[['网关动作','丢弃'],['后续链路','没有原包传输']]}),
      localStep(lesson.steps[2],{title:'网关返回 ICMP 超时',from:'router',to:'client',message:'ICMP Time Exceeded · type 11 code 0',description:'网关通常生成一个新的 ICMP 差错报文，向原发送端报告 TTL 过期。此差错报文有自己的 IP 首部和 TTL。',insight:'不是把 TTL 为零的原包转发回去，也不是目标服务器的应答。',state:'源主机收到 TTL 过期反馈',segments:[{label:'新的 IP 首部',type:'ip'},{label:'ICMP Time Exceeded',type:'icmp'}],rows:[['原数据报','已丢弃'],['新报文','网关 → 源主机'],['服务器','未收到原包']]}),
    ];
    return {...lesson,steps,assumption:lesson.assumption.replace('成功的 IPv4 单播路径；TTL 从 3 开始','TTL 在第一台路由器过期的路径；初始 TTL 为 1')+' 假设 ICMP 差错可返回。'};
  }
  if(id==='reliability'&&mode==='no-loss') {
    const steps=[
      localStep(lesson.steps[0],{title:'第一段正常到达',to:'server',dropped:false,message:'seq=101 · len=100',description:'字节 101–200 顺序到达接收端，没有出现缺口。',state:'连续收到至 200',rows:[['接收进度','101–200'],['缺口','无']],cells:['101–200:已到达','201–300:未发','301–400:未发']}),
      localStep(lesson.steps[2],{title:'确认前 100 字节',message:'ACK=201',description:'接收方下一步期望字节 201，发送端收到确认后可以释放已确认数据的重传副本。',insight:'累计确认指向下一个期望字节；按字节计数，不是按报文个数。',state:'ACK=201',rows:[['累计 ACK','201'],['应用可交付至','200']],cells:['101–200:已确认','201–300:未发','301–400:未发']}),
      localStep(lesson.steps[1],{title:'后一段也顺序到达',description:'字节 201–300 正常抵达，与前面的数据连续，可以继续交付。',state:'连续收到至 300',rows:[['接收进度','101–300'],['缺口','无']],cells:['101–200:已确认','201–300:已到达','301–400:未发']}),
      localStep(lesson.steps[4],{description:'接收端累计确认到 301；这次没有缺口，也没有超时重传。',insight:'与丢包路径对照：相同的应用数据和序号，网络上需要的报文与等待不同。'}),
    ];
    return {...lesson,steps,assumption:'连接已建立，每段 100 字节，从序号 101 开始；无丢包、延迟 ACK 或拥塞。与丢包分支对照，序号按字节计数。'};
  }
  if(id==='cache'&&mode==='changed') {
    const steps=lesson.steps.map((step,index)=>index===4?localStep(step,{title:'资源变了，返回新消息体',message:'200 OK · ETag="v2" · 新 CSS',description:'源站发现当前表示不再匹配 "v1"，返回 200 和新消息体。客户端替换旧缓存，并保存新的验证器。',insight:'条件请求不是必然得到 304；取决于验证器是否匹配当前表示。',state:'缓存已更新为 v2',rows:[['状态码','200'],['ETag','"v2"'],['使用内容','新响应的 CSS 消息体']],segments:[{label:'200 + 新消息体',type:'http'}]}):step);
    return {...lesson,steps,assumption:lesson.assumption+' 对照分支假设源站在第 70 秒前更新了资源，ETag 变为 "v2"。'};
  }
  return lesson;
}
