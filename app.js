'use strict';
/* BPCare – demo front-end. Data lives in localStorage (see README for production backend notes). */
const C={b:'#0099FF',p:'#E825DE'},DAY=864e5;
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const K='bpcare_v1';let db=JSON.parse(localStorage.getItem(K)||'{"users":[],"sess":null,"data":{},"reset":null}');
const GH=()=>JSON.parse(localStorage.getItem('bpgh')||'null'),GPATH='backend/storage/accounts/users.json';
let gsha=null,gt=null;
const ghf=(m,b)=>{const g=GH();return fetch(`https://api.github.com/repos/${g.repo}/contents/${GPATH}`+(m==='GET'?'?t='+Date.now():''),{method:m,cache:'no-store',headers:{Authorization:'Bearer '+g.token,Accept:'application/vnd.github+json'},body:b&&JSON.stringify(b)})};
const b64=s=>{let o='';new TextEncoder().encode(s).forEach(c=>o+=String.fromCharCode(c));return btoa(o)},unb64=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g,'')),c=>c.charCodeAt(0)));
const save=()=>{localStorage.setItem(K,JSON.stringify(db));if(!GH())return;clearTimeout(gt);gt=setTimeout(push,1500)};
async function push(retry=1){try{const{sess,...d}=db;const r=await ghf('PUT',{message:'update accounts',content:b64(JSON.stringify(d,null,1)),...(gsha?{sha:gsha}:{})});
if(r.ok){gsha=(await r.json()).content.sha;return}
if((r.status===409||r.status===422)&&retry){await pull(true);return push(0)}toast('GitHub save failed ('+r.status+')')}catch{toast('GitHub save failed (offline?)')}}
async function pull(shaOnly){if(!GH())return;const r=await ghf('GET');if(r.status===404){gsha=null;return}if(!r.ok){toast('GitHub error '+r.status+' – check token/repo');return}const j=await r.json();gsha=j.sha;if(shaOnly)return;const x=JSON.parse(unb64(j.content));if(x.users){db={...x,sess:db.sess};localStorage.setItem(K,JSON.stringify(db))}}
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const U=()=>db.users.find(u=>u.id===db.sess),D=()=>db.data[db.sess];
const fmt=t=>new Date(t).toLocaleString([],{dateStyle:'medium',timeStyle:'short'});
const p2=n=>String(n).padStart(2,'0'),day=t=>{const d=new Date(t);return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())};
const CN=['Normal','Elevated','Hypertension Stage 1','Hypertension Stage 2','Crisis range – seek medical advice'];
const cat=(s,d)=>s>180||d>120?4:s>=140||d>=90?3:s>=130||d>=80?2:s>=120?1:0;
const bd=r=>`<span class="bd c${cat(r.sys,r.dia)}">${CN[cat(r.sys,r.dia)]}</span>`+(r.sample?' <span class="bd s">Sample</span>':'');
const avg=(a,k)=>a.length?Math.round(a.reduce((x,r)=>x+r[k],0)/a.length):'–';
const empty=m=>`<div class=empty><div class=ring></div><p>${m}</p></div>`;
const card=(t,v,s,c='')=>`<div class=card><small>${t}</small><b class="big ${c}">${v}</b><span class=mut>${s}</span></div>`;
const post=[],P={},A={},F={};let ch={},LV=null;
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),3500)}
const note=(m,t='info')=>D().notifs.unshift({id:crypto.randomUUID(),ts:Date.now(),m,t,read:false});
const log=(a,d=D())=>{d.audit.unshift({ts:Date.now(),a});if(d.audit.length>50)d.audit.length=50};
function seed(){const o=[],n=Date.now();for(let i=89;i>=0;i--)for(const h of[7,13,20]){if(Math.random()<.25)continue;const t=new Date(n-i*DAY);t.setHours(h,Math.floor(Math.random()*40),0,0);if(+t>n)continue;const m=h<10?6:0;o.push({id:crypto.randomUUID(),sys:Math.round(121+m+Math.random()*22+(i>30?4:0)),dia:Math.round(76+m/2+Math.random()*12),pulse:Math.round(64+Math.random()*20),ts:+t,src:'automatic',dev:'sample',note:'',sample:true})}return o}
function add(r){const d=D();if(!(r.sys>=60&&r.sys<=260&&r.dia>=30&&r.dia<=160&&r.pulse>=30&&r.pulse<=220&&r.sys>r.dia)){toast('Enter realistic values (systolic must exceed diastolic).');return false}
if(d.readings.some(x=>x.ts===r.ts&&x.dev===r.dev&&x.sys===r.sys&&x.dia===r.dia)){toast('Duplicate reading ignored.');return false}
d.readings.push({id:crypto.randomUUID(),note:'',sample:false,...r});d.readings.sort((a,b)=>a.ts-b.ts);
if(r.sys>=d.set.sys||r.dia>=d.set.dia)note(`Reading ${r.sys}/${r.dia} mmHg is at or above your configured threshold (${d.set.sys}/${d.set.dia}). This is not a diagnosis – discuss trends with your clinician.`,'alert');
save();return true}
const key={day:t=>day(t),week:t=>{const d=new Date(t);d.setDate(d.getDate()-(d.getDay()+6)%7);return day(d)},month:t=>day(t).slice(0,7),year:t=>day(t).slice(0,4)};
const grp=(rs,g)=>{const m={};rs.forEach(r=>(m[key[g](r.ts)]??=[]).push(r));return Object.keys(m).sort().map(k=>[k,m[k]])};
const inR=(rs,f,t)=>rs.filter(r=>day(r.ts)>=f&&day(r.ts)<=t);
const ds=(l,data,c,x={})=>({label:l,data,borderColor:c,backgroundColor:c+'33',tension:.3,pointRadius:2,...x});
function chart(id,type,labels,sets,opt={}){const e=document.getElementById(id);if(!e)return;ch[id]=new Chart(e,{type,data:{labels,datasets:sets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:sets.length>1||type==='doughnut'}},...opt}})}
function csv(rs,name){const b=rs.map(r=>[r.id,new Date(r.ts).toISOString(),r.sys,r.dia,r.pulse,r.src,r.dev||'',CN[cat(r.sys,r.dia)],r.sample,'"'+(r.note||'').replace(/^[=+\-@]/,"'$&").replace(/"/g,'""')+'"'].join(','));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['id,timestamp,systolic,diastolic,pulse,source,device,category,sample,notes\n'+b.join('\n')],{type:'text/csv'}));a.download=name;a.click()}
const cv=(id,t)=>`<div class=card><h2>${t}</h2><div class=cv><canvas id=${id}></canvas></div></div>`;
/* ---------- Auth ---------- */
let am='login';
const authView=()=>{const f={login:`<form data-f=login><label>Email</label><input name=email type=email required autocomplete=username><label>Password</label><input name=pw type=password required autocomplete=current-password><p><button style=width:100%>Log in</button></p><small><a data-a=mode data-m=register>Create account</a> · <a data-a=mode data-m=forgot>Forgot password?</a></small></form>`,
gh:`<form data-f=gh><label>Private data repo, e.g. yourname/bpcare-data</label><input name=repo value="${esc(GH()?.repo||'')}" required><label>Fine-grained token (Contents: read & write)</label><input name=token type=password required><p><button style=width:100%>Connect</button></p><small>Stored only on this device. <a data-a=mode data-m=login>Back</a></small></form>`,
register:`<form data-f=reg><label>Full name</label><input name=name required><label>Email</label><input name=email type=email required><label>Password (min 8)</label><input name=pw type=password minlength=8 required><label>I am a</label><select name=role><option value=patient>Patient</option><option value=doctor>Doctor</option></select><p><button style=width:100%>Register</button></p><small><a data-a=mode data-m=login>Back to login</a></small></form>`,
forgot:`<form data-f=forgot><label>Account email</label><input name=email type=email required><p><button style=width:100%>Send reset code</button></p><small>Demo: the code is shown on screen (no email server).</small><br><small><a data-a=mode data-m=login>Back</a></small></form>`,
reset:`<form data-f=reset><label>Reset code</label><input name=code required><label>New password</label><input name=pw type=password minlength=8 required><p><button style=width:100%>Reset password</button></p></form>`}[am];
return `<div class=auth><div class=card><h1 style="color:var(--b)">♥ BPCare</h1><small>Track, understand and share your blood pressure.</small>${f}<p><small><a data-a=mode data-m=gh>☁ ${GH()?'GitHub storage connected ✓':'Connect GitHub storage'}</a></small></p></div></div>`};
A.mode=t=>{am=t.dataset.m;render()};
F.login=async f=>{const e=f.email.trim().toLowerCase(),u=db.users.find(x=>x.email===e);if(!u||u.h!==await sha(e+f.pw))return toast('Invalid email or password.');db.sess=u.id;log('Login');save();location.hash='';render()};
F.reg=async f=>{const e=f.email.trim().toLowerCase();if(db.users.some(u=>u.email===e))return toast('Email already registered.');const id=crypto.randomUUID();
db.users.push({id,name:f.name.trim(),email:e,role:f.role,h:await sha(e+f.pw)});
db.data[id]={readings:f.role==='patient'?seed():[],notifs:[],devices:[],reports:[],audit:[],clin:[],access:[],consent:true,set:{sys:140,dia:90,remind:'08:00'},prof:{}};
db.sess=id;log('Account created');save();location.hash='';render()};
F.forgot=f=>{const u=db.users.find(x=>x.email===f.email.trim().toLowerCase());if(u){db.reset={id:u.id,code:String(Math.random()).slice(2,8),exp:Date.now()+6e5};save();toast('Demo reset code: '+db.reset.code)}else toast('If the account exists, a code was sent.');am='reset';render()};
F.reset=async f=>{const r=db.reset;if(!r||r.code!==f.code.trim()||r.exp<Date.now())return toast('Invalid or expired code.');const u=db.users.find(x=>x.id===r.id);u.h=await sha(u.email+f.pw);db.reset=null;save();toast('Password updated. Please log in.');am='login';render()};
F.gh=async f=>{if(!/^[\w.-]+\/[\w.-]+$/.test(f.repo.trim()))return toast('Repo must look like name/repo');localStorage.setItem('bpgh',JSON.stringify({repo:f.repo.trim(),token:f.token.trim()}));am='login';await pull().catch(()=>toast('Could not reach GitHub'));toast('GitHub connected');render()};
A.ghoff=()=>{localStorage.removeItem('bpgh');render()};
A.out=()=>{clearInterval(LV);LV=null;db.sess=null;save();am='login';render()};
/* ---------- Pages ---------- */
const NAV=[['dashboard','⌂','Dashboard'],['monitor','♥','BP Monitoring'],['history','☰','History'],['analysis','∿','Analysis'],['reports','▤','Reports'],['notifications','◔','Notifications'],['profile','☺','Profile'],['devices','⌁','Devices'],['settings','⚙','Settings']];
const DN=[['doctor','✚','Doctor Dashboard'],['profile','☺','Profile']];
const lastSync=d=>{const t=Math.max(0,...d.readings.filter(r=>r.src==='automatic'&&!r.sample).map(r=>r.ts),d.devices[0]?.last||0);return t?fmt(t):'Never'};
P.dashboard=()=>{const d=D(),rs=d.readings,l=rs.at(-1),v=d.devices[0],n=Date.now(),w=rs.filter(r=>r.ts>n-7*DAY),m=rs.filter(r=>r.ts>n-30*DAY);
post.push(()=>{const g=grp(rs.filter(r=>r.ts>n-14*DAY),'day');chart('dc','line',g.map(x=>x[0].slice(5)),[ds('Systolic',g.map(x=>avg(x[1],'sys')),C.b),ds('Diastolic',g.map(x=>avg(x[1],'dia')),C.p)])});
return `<h1>Hello, ${esc(U().name.split(' ')[0])}</h1>${rs.some(r=>r.sample)?`<div class=note>Sample readings are labelled <b>Sample</b> and are not your measurements. <a href=# data-a=clr style="color:var(--b)">Remove sample data</a></div>`:''}`+
(l?`<div class=grid>${card('Systolic (mmHg)',l.sys,bd(l))}${card('Diastolic (mmHg)',l.dia,'Latest reading')}${card('Pulse (BPM)',l.pulse,fmt(l.ts),'p')}
<div class=card><small>Device</small><b style="font-size:1.1rem"><span class="dot ${v?.conn?'':'off'}"></span>${v?(v.conn?'Connected':'Disconnected'):'No device paired'}</b><br><span class=mut>${v?esc(v.name)+' · ':''}Last sync: ${lastSync(d)}</span></div></div>`:empty('No readings yet. Add one under BP Monitoring.'))+
`<div class=grid>${card('Weekly average',w.length?avg(w,'sys')+'/'+avg(w,'dia'):'–',w.length+' readings · pulse '+avg(w,'pulse'))}${card('Monthly average',m.length?avg(m,'sys')+'/'+avg(m,'dia'):'–',m.length+' readings · pulse '+avg(m,'pulse'),'p')}</div>`+
cv('dc','Last 14 days')+`<div class=card><h2>Recent readings</h2><div class=scroll><table>${rs.slice(-5).reverse().map(r=>`<tr data-a=view data-id=${r.id}><td>${fmt(r.ts)}</td><td>${r.sys}/${r.dia}</td><td>${r.pulse} BPM</td><td>${bd(r)}</td></tr>`).join('')}</table></div></div>`};
A.clr=()=>{const d=D();d.readings=d.readings.filter(r=>!r.sample);save();toast('Sample data removed.');render()};
P.monitor=()=>{const d=D(),v=d.devices[0],n=new Date();n.setMinutes(n.getMinutes()-n.getTimezoneOffset());
return `<h1>BP Monitoring</h1><div class=two><div class=card><h2>Automatic (device)</h2><p>${v?`<span class="dot ${v.conn?'':'off'}"></span>${esc(v.name)} – ${v.conn?'connected':'disconnected'}<br><small>Last sync: ${lastSync(d)}</small>`:'No device paired yet.'}</p>
<button data-a=sync>Receive reading now</button> <button class=ol data-a=live>${LV?'Stop':'Start'} live mode</button><p><small>Demo device simulator. New readings appear instantly; duplicates (same device + timestamp) are ignored. Live mode simulates a reading every 20 s.</small></p></div>
<form class=card data-f=manual><h2>Manual entry (backup)</h2><div class=row><div><label>Systolic</label><input name=sys type=number required></div><div><label>Diastolic</label><input name=dia type=number required></div><div><label>Pulse</label><input name=pulse type=number required></div></div>
<label>Date & time</label><input name=ts type=datetime-local value="${n.toISOString().slice(0,16)}" required><label>Notes (optional)</label><input name=note maxlength=200><p><button>Save reading</button></p></form></div>`+
`<div class=card style=margin-top:14px><h2>Latest readings</h2><div class=scroll><table>${d.readings.slice(-6).reverse().map(r=>`<tr><td>${fmt(r.ts)}</td><td>${r.sys}/${r.dia}</td><td>${r.pulse}</td><td>${r.src}</td><td>${bd(r)}</td></tr>`).join('')}</table></div></div>`};
F.manual=f=>{if(add({sys:+f.sys,dia:+f.dia,pulse:+f.pulse,ts:+new Date(f.ts),src:'manual',dev:null,note:f.note})){toast('Reading saved.');render()}};
A.sync=()=>{const d=D(),v=d.devices[0];if(!v)return toast('Pair a device first (Devices page).');
if(!v.conn){note(`Sync failed: ${v.name} is disconnected.`,'warn');save();toast('Sync failed – device disconnected.');return render()}
if(add({sys:Math.round(118+Math.random()*28),dia:Math.round(72+Math.random()*16),pulse:Math.round(62+Math.random()*22),ts:Math.floor(Date.now()/1e3)*1e3,src:'automatic',dev:v.id})){v.last=Date.now();save();toast('New reading received from '+v.name)}render()};
A.live=()=>{if(LV){clearInterval(LV);LV=null}else LV=setInterval(()=>{if(db.sess&&U().role==='patient')A.sync()},2e4);render()};
const H={q:'',from:'',to:'',sort:'desc'};
function rows(){const r=D().readings.filter(x=>(!H.from||day(x.ts)>=H.from)&&(!H.to||day(x.ts)<=H.to)&&(!H.q||`${x.sys}/${x.dia} ${x.pulse} ${x.note} ${x.src}`.toLowerCase().includes(H.q.toLowerCase()))).sort((a,b)=>H.sort==='desc'?b.ts-a.ts:a.ts-b.ts);
return r.length?`<div class=scroll><table><tr><th>Date & time<th>Systolic<th>Diastolic<th>Pulse<th>Source<th>Status</tr>${r.slice(0,200).map(x=>`<tr data-a=view data-id=${x.id}><td>${fmt(x.ts)}<td>${x.sys}<td>${x.dia}<td>${x.pulse}<td>${x.src}<td>${bd(x)}${x.note?' ✎':''}</tr>`).join('')}</table></div><small>${r.length} readings${r.length>200?' (showing 200)':''}</small>`:empty('No readings match your filters.')}
P.history=()=>`<h1>BP History</h1><div class="card noprint"><div class=row><div><label>Search</label><input data-h=q value="${esc(H.q)}" placeholder="value, note…"></div><div><label>From</label><input type=date data-h=from value=${H.from}></div><div><label>To</label><input type=date data-h=to value=${H.to}></div><div><label>Sort</label><select data-h=sort><option value=desc>Latest first</option><option value=asc ${H.sort=='asc'?'selected':''}>Oldest first</option></select></div><button class=ol data-a=exp>Export CSV</button></div></div><div class=card id=htab>${rows()}</div>`;
A.exp=()=>{csv(D().readings,'bp-history.csv');log('Exported history')};
A.view=t=>{const r=D().readings.find(x=>x.id===t.dataset.id);if(!r)return;const m=document.createElement('dialog');m.innerHTML=`<h2>Reading details</h2><b class=big>${r.sys}/${r.dia}</b><p>Pulse ${r.pulse} BPM · ${fmt(r.ts)}<br>${bd(r)}<br><small>Source: ${r.src}${r.dev?' · Device: '+esc(r.dev):''} · ID ${r.id.slice(0,8)}</small></p><label>Notes</label><textarea id=nt maxlength=300>${esc(r.note)}</textarea><p><button data-a=nsave data-id=${r.id}>Save note</button> <button class=ol data-a=del data-id=${r.id}>Delete</button> <button class=ol data-a=cl>Close</button></p>`;document.body.append(m);m.showModal();m.addEventListener('close',()=>m.remove())};
A.cl=()=>document.querySelector('dialog')?.close();
A.nsave=t=>{D().readings.find(x=>x.id===t.dataset.id).note=$('#nt').value;save();A.cl();toast('Note saved.');render()};
A.del=t=>{if(!confirm('Delete this reading?'))return;const d=D();d.readings=d.readings.filter(x=>x.id!==t.dataset.id);log('Deleted a reading');save();A.cl();render()};
const AN={from:day(Date.now()-29*DAY),to:day(Date.now()),g:'day'};
P.analysis=()=>{const all=D().readings,rs=inR(all,AN.from,AN.to),n=Math.round((new Date(AN.to)-new Date(AN.from))/DAY)+1,pf=day(new Date(AN.from)-n*DAY),pt=day(new Date(AN.from)-DAY),pr=inR(all,pf,pt),g=grp(rs,AN.g),L=g.map(x=>x[0]);
post.push(()=>{chart('a1','line',L,[ds('Systolic',g.map(x=>avg(x[1],'sys')),C.b),ds('Diastolic',g.map(x=>avg(x[1],'dia')),C.p)]);
chart('a3','line',L,[ds('Pulse (BPM)',g.map(x=>avg(x[1],'pulse')),C.p)]);
const T=[['Morning',r=>new Date(r.ts).getHours()<12],['Afternoon',r=>{const h=new Date(r.ts).getHours();return h>=12&&h<17}],['Evening',r=>new Date(r.ts).getHours()>=17]].map(([a,f])=>[a,rs.filter(f)]);
chart('a4','bar',T.map(x=>x[0]),[{label:'Systolic',data:T.map(x=>avg(x[1],'sys')),backgroundColor:C.b},{label:'Diastolic',data:T.map(x=>avg(x[1],'dia')),backgroundColor:C.p}]);
chart('a5','doughnut',CN.map(x=>x.split(' –')[0]),[{data:CN.map((_,i)=>rs.filter(r=>cat(r.sys,r.dia)===i).length),backgroundColor:[C.b,C.b+'99',C.b+'44',C.p+'99',C.p]}],{interaction:{}});
});
return `<h1>Graphical Analysis</h1><div class="card noprint"><div class=row><div><label>From</label><input type=date name=from data-c=anr value=${AN.from}></div><div><label>To</label><input type=date name=to data-c=anr value=${AN.to}></div><div><label>Group by</label><select data-c=ang>${['day','week','month','year'].map(x=>`<option ${AN.g==x?'selected':''}>${x}</option>`).join('')}</select></div>
${[7,30,90,365].map(x=>`<button class="ol sm" data-a=pre data-d=${x}>${x}d</button>`).join('')}</div></div>
<div class=grid>${card('Avg systolic',avg(rs,'sys'),'mmHg')}${card('Avg diastolic',avg(rs,'dia'),'mmHg','p')}${card('Avg pulse',avg(rs,'pulse'),'BPM')}${card('Readings',rs.length,'in range')}</div>${rs.length?`<div class=two>${cv('a1','BP trend ('+AN.g+')')}${cv('a3','Pulse trend')}${cv('a4','Morning / afternoon / evening')}${cv('a5','Category distribution')}</div>`:empty('No readings in this range.')}`};
A.pre=t=>{AN.to=day(Date.now());AN.from=day(Date.now()-(+t.dataset.d-1)*DAY);render()};
A.anr=t=>{AN[t.name]=t.value;render()};A.ang=t=>{AN.g=t.value;render()};
const R={t:'weekly',date:day(Date.now())};
function rr(){const d=new Date(R.date+'T12:00');let f=new Date(d),e=new Date(d);if(R.t==='weekly')f.setDate(d.getDate()-6);if(R.t==='monthly'){f=new Date(d.getFullYear(),d.getMonth(),1,12);e=new Date(d.getFullYear(),d.getMonth()+1,0,12)}if(R.t==='yearly'){f=new Date(d.getFullYear(),0,1,12);e=new Date(d.getFullYear(),11,31,12)}return[day(f),day(e)]}
P.reports=()=>{const[f,t]=rr(),rs=inR(D().readings,f,t),g=grp(rs,R.t==='yearly'?'month':'day');
post.push(()=>R.t==='daily'?chart('rc','line',rs.map(r=>new Date(r.ts).toLocaleTimeString([],{timeStyle:'short'})),[ds('Systolic',rs.map(r=>r.sys),C.b),ds('Diastolic',rs.map(r=>r.dia),C.p)]):chart('rc','line',g.map(x=>x[0]),[ds('Systolic',g.map(x=>avg(x[1],'sys')),C.b),ds('Diastolic',g.map(x=>avg(x[1],'dia')),C.p)],{animation:false}));
return `<h1>Reports</h1><div class="card noprint"><div class=row><div><label>Report type</label><select data-c=rt>${['daily','weekly','monthly','yearly'].map(x=>`<option ${R.t==x?'selected':''}>${x}</option>`).join('')}</select></div><div><label>Date</label><input type=date data-c=rd value=${R.date}></div><button data-a=pdf>Download PDF</button><button class=ol data-a=rcsv>Export CSV</button></div><small>PDF: choose “Save as PDF” in the print dialog.</small></div>
<div class=card id=report><h2>${R.t[0].toUpperCase()+R.t.slice(1)} BP report – ${esc(U().name)}</h2><p class=mut>${f}${f!==t?' to '+t:''} · ${rs.length} readings</p><div class=grid>${card('Avg BP',avg(rs,'sys')+'/'+avg(rs,'dia'),'mmHg')}${card('Avg pulse',avg(rs,'pulse'),'BPM','p')}</div>${rs.length?`<div class=cv><canvas id=rc></canvas></div><div class=scroll><table><tr><th>Date & time<th>BP<th>Pulse<th>Status</tr>${rs.map(r=>`<tr><td>${fmt(r.ts)}<td>${r.sys}/${r.dia}<td>${r.pulse}<td>${bd(r)}</tr>`).join('')}</table></div>`:empty('No readings for this period.')}<p class=disc>For information only. Not a diagnosis; do not change medication based on this report. Sample readings (if any) are labelled.</p></div>`};
A.pdf=()=>{const d=D(),[f,t]=rr();d.reports.push({id:crypto.randomUUID(),type:R.t,from:f,to:t,ts:Date.now()});log('Generated '+R.t+' report');save();setTimeout(()=>print(),200)};
A.rcsv=()=>{const[f,t]=rr();csv(inR(D().readings,f,t),`bp-${R.t}-${f}.csv`)};
A.rt=t=>{R.t=t.value;render()};A.rd=t=>{R.date=t.value||R.date;render()};
P.notifications=()=>{const d=D(),n=new Date(),due=!d.readings.some(r=>!r.sample&&day(r.ts)===day(n))&&n.toTimeString().slice(0,5)>=d.set.remind;
return `<h1>Notifications</h1>${due?`<div class=note>⏰ Reminder: no measurement recorded today yet (reminder time ${d.set.remind}).</div>`:''}<p><button class=ol data-a=readall>Mark all read</button></p><div class=card>${d.notifs.length?d.notifs.map(x=>`<p style="${x.read?'opacity:.6':''}"><span class="bd ${x.t==='alert'?'c4':x.t==='warn'?'c2':'c0'}">${x.t}</span> ${esc(x.m)}<br><small>${fmt(x.ts)}</small></p>`).join(''):empty('You are all caught up.')}</div>`};
A.readall=()=>{D().notifs.forEach(x=>x.read=true);save();render()};
P.devices=()=>{const d=D();return `<h1>Device Management</h1><form class=card data-f=pair><h2>Pair a device</h2><div class=row><div><label>Device name</label><input name=name placeholder="e.g. Omron BP7000" required></div><div><label>Connection</label><select name=type><option>Bluetooth</option><option>Wi-Fi</option></select></div><button>Pair</button></div><small>Demo uses a simulator. Real hardware: see README (Web Bluetooth).</small></form><div class=card><h2>My devices</h2>${d.devices.length?d.devices.map(v=>`<p><span class="dot ${v.conn?'':'off'}"></span><b>${esc(v.name)}</b> (${v.type}) – ${v.conn?'connected':'disconnected'} <button class="sm ol" data-a=tog data-id=${v.id}>${v.conn?'Disconnect':'Connect'}</button> <button class="sm ol" data-a=unp data-id=${v.id}>Remove</button></p>`).join(''):empty('No devices paired.')}</div>`};
F.pair=f=>{const d=D();d.devices.push({id:'dev-'+crypto.randomUUID().slice(0,8),name:f.name,type:f.type,conn:true,last:0});log('Paired '+f.name);save();render()};
A.tog=t=>{const v=D().devices.find(x=>x.id===t.dataset.id);v.conn=!v.conn;if(!v.conn)note(v.name+' disconnected.','warn');save();render()};
A.unp=t=>{const d=D();d.devices=d.devices.filter(x=>x.id!==t.dataset.id);save();render()};
P.profile=()=>{const d=D(),u=U(),p=d.prof;return `<h1>Profile</h1><form class=card data-f=prof><div class=prow>${p.photo?`<img class=ph src="${p.photo}" alt="">`:`<div class=ph>${esc((u.name[0]||'?').toUpperCase())}</div>`}<div><label>Photo (optional, under 400 KB)</label><input type=file accept=image/* id=ph></div></div><div class=row><div><label>Name</label><input name=name value="${esc(u.name)}" required></div><div><label>Age</label><input name=age type=number min=1 max=120 value="${esc(p.age)}"></div><div><label>Gender (optional)</label><select name=gender>${['','Female','Male','Other','Prefer not to say'].map(x=>`<option ${p.gender==x?'selected':''}>${x}</option>`).join('')}</select></div></div><div class=row><div><label>Email</label><input value="${esc(u.email)}" disabled></div><div><label>Phone</label><input name=phone value="${esc(p.phone)}"></div><div><label>Measurement arm</label><select name=arm>${['Left','Right'].map(x=>`<option ${p.arm==x?'selected':''}>${x}</option>`).join('')}</select></div></div><p><button>Save profile</button></p></form>${u.role==='patient'?`<div class=card><h2>Connected devices</h2>${d.devices.map(v=>esc(v.name)).join(', ')||'None'}<h2 style=margin-top:12px>Clinician notes</h2>${d.clin.map(c=>`<p>${esc(c.text)}<br><small>${esc(c.by)} · ${fmt(c.ts)}</small></p>`).join('')||'<small>None yet.</small>'}</div>`:''}`};
F.prof=async(f,form)=>{const d=D(),u=U(),file=$('#ph')?.files[0];u.name=f.name;Object.assign(d.prof,{age:f.age,gender:f.gender,phone:f.phone,arm:f.arm});
if(file&&file.size<4e5)d.prof.photo=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(file)});else if(file)toast('Photo must be under 400 KB.');
log('Profile updated');save();toast('Profile saved.');render()};
P.settings=()=>{const d=D(),docs=db.users.filter(u=>u.role==='doctor');return `<h1>Settings</h1><form class=card data-f=thr><h2>Personal thresholds</h2><small>Set these together with your clinician. Defaults: 140/90.</small><div class=row><div><label>Systolic ≥</label><input name=sys type=number value=${d.set.sys}></div><div><label>Diastolic ≥</label><input name=dia type=number value=${d.set.dia}></div><div><label>Daily reminder</label><input name=remind type=time value=${d.set.remind}></div><button>Save</button></div></form>
<div class=card><h2>Consent & doctor access</h2>${docs.length?docs.map(x=>`<p><label style="display:flex;gap:8px;margin:0"><input type=checkbox style=width:auto data-c=acc data-id=${x.id} ${d.access.includes(x.id)?'checked':''}> Dr. ${esc(x.name)} may view my readings</label></p>`).join(''):'<small>No doctors registered yet.</small>'}</div>
<div class=card><h2>Data & privacy</h2><button class=ol data-a=exall>Download all my data</button> <button class=ol data-a=seed>Reload sample data</button> <button class=pk data-a=delacc>Delete account</button></div>
<div class=card><h2>GitHub storage</h2>${GH()?'Connected to '+esc(GH().repo)+' <button class="ol sm" data-a=ghoff>Disconnect this device</button>':'Not connected – data stays on this device only. Log out to connect.'}</div>
<div class=card><h2>Audit log</h2>${d.audit.slice(0,10).map(a=>`<small>${fmt(a.ts)} – ${esc(a.a)}</small><br>`).join('')}</div>`};
F.thr=f=>{Object.assign(D().set,{sys:+f.sys,dia:+f.dia,remind:f.remind});log('Thresholds changed');save();toast('Settings saved.')};
A.acc=t=>{const a=D().access,i=t.dataset.id;t.checked?a.includes(i)||a.push(i):a.splice(a.indexOf(i),1);log((t.checked?'Granted':'Revoked')+' doctor access');save();toast('Access updated.')};
A.exall=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({user:U(),data:D()},null,1)],{type:'application/json'}));a.download='my-bp-data.json';a.click()};
A.seed=()=>{const d=D();d.readings=[...d.readings.filter(r=>!r.sample),...seed()].sort((a,b)=>a.ts-b.ts);save();toast('Sample data loaded.')};
A.delacc=()=>{if(!confirm('Permanently delete your account and all data?'))return;db.users=db.users.filter(u=>u.id!==db.sess);delete db.data[db.sess];db.sess=null;save();render()};
let DP=null;
P.doctor=()=>{const ps=db.users.filter(u=>u.role==='patient'&&db.data[u.id].access.includes(db.sess));if(!ps.some(p=>p.id===DP))DP=ps[0]?.id;
if(!ps.length)return `<h1>Doctor Dashboard</h1>`+empty('No patients have granted you access yet. Patients can do this in Settings.');
const p=db.data[DP],rs=p.readings,m=rs.filter(r=>r.ts>Date.now()-30*DAY);post.push(()=>{const g=grp(m,'day');chart('dc','line',g.map(x=>x[0].slice(5)),[ds('Systolic',g.map(x=>avg(x[1],'sys')),C.b),ds('Diastolic',g.map(x=>avg(x[1],'dia')),C.p)])});
return `<h1>Doctor Dashboard</h1><div class=card><label>Patient</label><select data-c=dsel>${ps.map(x=>`<option value=${x.id} ${x.id==DP?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class=grid>${card('30-day average',avg(m,'sys')+'/'+avg(m,'dia'),m.length+' readings')}${card('Avg pulse',avg(m,'pulse'),'BPM','p')}</div>${cv('dc','30-day trend')}<div class=card><h2>Recent readings</h2><div class=scroll><table>${rs.slice(-15).reverse().map(r=>`<tr><td>${fmt(r.ts)}<td>${r.sys}/${r.dia}<td>${r.pulse}<td>${bd(r)}</tr>`).join('')}</table></div><p><button class=ol data-a=dcsv>Download CSV</button></p></div><form class=card data-f=clin><h2>Clinical note</h2><textarea name=text required maxlength=500></textarea><p><button>Add note</button></p>${p.clin.map(c=>`<p>${esc(c.text)}<br><small>${esc(c.by)} · ${fmt(c.ts)}</small></p>`).join('')}</form>`};
A.dsel=t=>{DP=t.value;log('Viewed by Dr. '+U().name,db.data[DP]);save();render()};
A.dcsv=()=>csv(db.data[DP].readings,'patient-readings.csv');
F.clin=f=>{const p=db.data[DP];p.clin.unshift({by:'Dr. '+U().name,ts:Date.now(),text:f.text});p.notifs.unshift({id:crypto.randomUUID(),ts:Date.now(),m:'Your doctor added a clinical note.',t:'info',read:false});save();render()};
/* ---------- Shell & events ---------- */
function render(){Object.values(ch).forEach(c=>c.destroy());ch={};const a=$('#app');if(!db.sess||!U()){a.innerHTML=authView();return}
const doc=U().role==='doctor',nav=doc?DN:NAV;let p=location.hash.slice(2)||nav[0][0];if(!nav.some(n=>n[0]===p))p=nav[0][0];const un=D().notifs.filter(n=>!n.read).length;
a.innerHTML=`<nav class=side><div class=brand>♥ BPCare</div>${nav.map(n=>`<a href="#/${n[0]}" class="${n[0]===p?'on':''}"><i>${n[1]}</i><span>${n[2]}${n[0]==='notifications'&&un?` <em>${un}</em>`:''}</span></a>`).join('')}<a href=# data-a=out><i>⏻</i><span>Logout</span></a></nav><main>${P[p]()}<p class=disc>BPCare is for tracking only and does not diagnose or recommend medication changes. A single reading is not a diagnosis. Seek urgent care for severe symptoms or readings in the crisis range.</p></main>`;
post.splice(0).forEach(f=>f())}
document.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(t){if(t.tagName!=='INPUT')e.preventDefault();A[t.dataset.a]?.(t)}});
document.addEventListener('change',e=>{const t=e.target.closest('[data-c]');if(t)A[t.dataset.c]?.(t)});
document.addEventListener('input',e=>{const t=e.target;if(t.dataset.h){H[t.dataset.h]=t.value;$('#htab').innerHTML=rows()}});
document.addEventListener('submit',e=>{e.preventDefault();F[e.target.dataset.f]?.(Object.fromEntries(new FormData(e.target)),e.target)});
addEventListener('hashchange',render);addEventListener('storage',e=>{if(e.key===K){db=JSON.parse(e.newValue);render()}});
function load(){pull().catch(()=>toast('Could not reach GitHub')).then(render)}
load();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!document.querySelector('dialog[open]')&&db.sess)load()});
