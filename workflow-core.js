'use strict';
// Shared, deterministic rules. Priority is independent from the sales pipeline.
const WorkflowCore = (() => {
  const terminal = s => ['Sold','Bound / Sold','Declined','Dead / Lost','Closed'].includes(s);
  const due = (t,now=Date.now()) => !!t && !t.done && Number.isFinite(t.at) && t.at<=now;
  function priority(l,t,override,now=Date.now()) {
    if(terminal(l.status))return null;
    if(override?.value)return {value:override.value,reason:'Chosen by agent',manual:true};
    if(l.status==='Quoted')return {value:'cold',reason:'Quote sent · waiting for a decision'};
    if(l.status==='Not Reached'&&Number(l.calls)>=3)return {value:'cold',reason:'Not reached after 3 or more calls'};
    if(t&&!t.done&&t.at>now+72*3600000)return {value:'cold',reason:'Follow-up is more than 3 days away'};
    if(!t&&l.status==='Not Reached'&&l.updated_ts&&now-l.updated_ts>=7*86400000)return {value:'cold',reason:'No response for 7 days'};
    return {value:'hot',reason:due(t,now)?'Follow-up needs attention':'Active opportunity'};
  }
  function filter(l,f,t,override,now) {
    if(f==='sold')return ['Sold','Bound / Sold'].includes(l.status);
    if(f==='closed')return ['Declined','Dead / Lost','Closed'].includes(l.status);
    if(terminal(l.status))return false;
    return f==='all'||priority(l,t,override,now)?.value===f;
  }
  const reasons=['Purchased elsewhere','Premium too high','Not eligible / underwriting','Coverage unavailable','Outside service area','No longer needs coverage','Not interested','Unable to reach after repeated attempts','Duplicate / invalid inquiry','Other'];
  return {terminal,due,priority,filter,reasons};
})();
if(typeof module!=='undefined')module.exports=WorkflowCore;
