function lm3SafeUrl(u){try{var p=new URL(String(u));return ['https:','http:'].includes(p.protocol)?p.href:null}catch(e){return null}}
function cerrarSeguro(){parent.postMessage({type:'close-research'},location.origin)}
function cerrarVerify(){parent.postMessage({type:'close-research'},location.origin)}
window.addEventListener('message',function(e){if(e.origin!==location.origin||e.data?.type!=='show-research')return;var s=document.getElementById('research-sheet');try{if(e.data.kind==='verify')armarVerifySheet(s,e.data.data);else armarSeguroSheet(s,e.data.dot,e.data.data);const w=document.createTreeWalker(s,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){n.textContent=n.textContent.replace(/(?:\+1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/g,'Contact via Call / Text')}s.querySelectorAll('a[href^="tel:"],a[href^="sms:"]').forEach(a=>{a.textContent='Contact via Call / Text';a.removeAttribute('href')})}catch(err){s.textContent='This saved research could not be displayed.'}});
document.addEventListener('click',function(e){var a=e.target.closest('a');if(a&&/^(tel:|sms:|mailto:)/i.test(a.getAttribute('href')||'')){e.preventDefault();parent.postMessage({type:'research-contact-blocked'},location.origin)}});
parent.postMessage({type:'research-ready'},location.origin);

document.addEventListener('click',e=>{const row=e.target.closest('[data-fleet-index]');if(row)toggleFlota(Number(row.dataset.fleetIndex))});
