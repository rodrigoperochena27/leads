'use strict';
// Shared, deterministic rules. Priority is independent from the sales pipeline.
const WorkflowCore = (() => {
  const terminal = s => ['Sold','Bound / Sold','Declined','Dead / Lost','Closed'].includes(s);
  const due = (t,now=Date.now()) => !!t && !t.done && Number.isFinite(t.at) && t.at<=now;
  function priority(l,t,override,now=Date.now()) {
    if(terminal(l.status))return null;
    if(override?.value)return {value:override.value,reason:'Chosen by agent',manual:true};
    // Current status age, with the received date as the legacy fallback.
    // Opening, priority edits and scheduling a future reminder do not reset this clock.
    const valid=v=>Number.isFinite(Number(v))&&Number(v)>0&&Number(v)<=now+300000;
    const at=valid(l.updated_ts)?Number(l.updated_ts):valid(l.sent_ts)?Number(l.sent_ts):0;
    if(!at)return {value:'cold',reason:'No reliable activity date · review this lead'};
    if(now-at>7*86400000)return {value:'cold',reason:'Last update is more than 7 days old'};
    return {value:'hot',reason:'Last update is within 7 days'};
  }
  function filter(l,f,t,override,now) {
    if(f==='sold')return ['Sold','Bound / Sold'].includes(l.status);
    if(f==='closed')return ['Declined','Dead / Lost','Closed'].includes(l.status);
    if(terminal(l.status))return false;
    return f==='all'||priority(l,t,override,now)?.value===f;
  }
  const reasons=['Purchased elsewhere','Premium too high','Not eligible / underwriting','Coverage unavailable','Outside service area','No longer needs coverage','Not interested','Unable to reach after repeated attempts','Duplicate / invalid inquiry','Other'];
  return {revision:'age-seven-days-v2',terminal,due,priority,filter,reasons};
})();
if(typeof module!=='undefined')module.exports=WorkflowCore;
