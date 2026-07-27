
const KEY='miProgresoDataV2';
const defaultData={profile:{name:'',height:'',goalWeight:'',calorieGoal:2000},foods:[],weights:[],doses:[],symptoms:[],theme:'light'};
let data=load();
function load(){try{return {...defaultData,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return JSON.parse(JSON.stringify(defaultData))}}
function save(){localStorage.setItem(KEY,JSON.stringify(data));renderAll()}
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const today=()=>new Date().toISOString().slice(0,10);
const fmtDate=d=>new Intl.DateTimeFormat('es-EC',{day:'2-digit',month:'short'}).format(new Date(d+'T12:00:00'));
const fmtDateTime=d=>new Intl.DateTimeFormat('es-EC',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(d));
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);

document.addEventListener('DOMContentLoaded',()=>{
  $('#todayLabel').textContent=new Intl.DateTimeFormat('es-EC',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  $('#foodDateFilter').value=today();
  $$('input[type=date]').forEach(i=>{if(!i.value)i.value=today()});
  const dt=new Date();dt.setMinutes(dt.getMinutes()-dt.getTimezoneOffset());$('input[type=datetime-local]').value=dt.toISOString().slice(0,16);
  bindUI();applyTheme();renderAll();registerSW();
});
function bindUI(){
  $$('.nav-item').forEach(b=>b.onclick=()=>{$$('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.view').forEach(v=>v.classList.remove('active'));$('#'+b.dataset.view).classList.add('active');window.scrollTo(0,0)});
  $$('[data-open]').forEach(b=>b.onclick=()=>openModal(b.dataset.open));
  $$('.close-modal').forEach(b=>b.onclick=closeModals);
  $$('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)closeModals()});
  $('#themeToggle').onclick=()=>{data.theme=data.theme==='dark'?'light':'dark';save()};
  $('#foodDateFilter').onchange=renderFood;
  $('#foodForm').onsubmit=e=>submitForm(e,'foods',o=>({...o,id:uid(),calories:+o.calories,protein:+o.protein||0,carbs:+o.carbs||0,fat:+o.fat||0}));
  $('#weightForm').onsubmit=e=>submitForm(e,'weights',o=>({...o,id:uid(),weight:+o.weight,waist:+o.waist||null}));
  $('#doseForm').onsubmit=e=>submitForm(e,'doses',o=>({...o,id:uid(),dose:+o.dose}));
  $('#symptomForm').onsubmit=e=>submitForm(e,'symptoms',o=>({...o,id:uid()}));
  $('#settingsForm').onsubmit=e=>{e.preventDefault();data.profile.calorieGoal=+new FormData(e.target).get('calorieGoal');save();closeModals()};
  $('#profileForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));data.profile={...data.profile,...f,height:+f.height||'',goalWeight:+f.goalWeight||''};save();closeModals()};
  $('#exportBackup').onclick=exportBackup;$('#importBackup').onchange=importBackup;$('#exportCsv').onclick=exportCsv;$('#clearData').onclick=clearData;
}
function submitForm(e,collection,mapper){e.preventDefault();const obj=mapper(Object.fromEntries(new FormData(e.target)));data[collection].push(obj);save();e.target.reset();$$('input[type=date]').forEach(i=>{if(!i.value)i.value=today()});closeModals()}
function openModal(id){
  $('#'+id).classList.add('open');
  if(id==='settingsModal')$('#settingsForm [name=calorieGoal]').value=data.profile.calorieGoal||2000;
  if(id==='profileModal'){for(const k of ['name','height','goalWeight'])$('#profileForm [name='+k+']').value=data.profile[k]||''}
}
function closeModals(){$$('.modal').forEach(m=>m.classList.remove('open'))}
function applyTheme(){document.documentElement.dataset.theme=data.theme||'light'}
function renderAll(){applyTheme();renderHome();renderFood();renderWeight();renderDose()}
function renderHome(){
  const td=today(),foods=data.foods.filter(x=>x.date===td),cal=foods.reduce((s,x)=>s+x.calories,0),goal=+data.profile.calorieGoal||2000;
  $('#caloriesConsumed').textContent=Math.round(cal);$('#calorieGoal').textContent=goal;$('#caloriesRemaining').textContent=Math.max(0,goal-cal);
  const pct=Math.min(100,cal/goal*100);$('#calorieBar').style.width=pct+'%';$('#calorieRing').style.background=`conic-gradient(#fff ${pct*3.6}deg,rgba(255,255,255,.25) 0deg)`;
  const ws=[...data.weights].sort((a,b)=>a.date.localeCompare(b.date)),cur=ws.at(-1),first=ws[0];
  $('#currentWeight').textContent=cur?cur.weight.toFixed(1)+' kg':'—';
  $('#weightDelta').textContent=cur&&first?(cur.weight-first.weight>0?'+':'')+(cur.weight-first.weight).toFixed(1)+' kg desde inicio':'Sin registros';
  const ds=[...data.doses].sort((a,b)=>a.datetime.localeCompare(b.datetime)),last=ds.at(-1);
  if(last){const next=new Date(last.datetime);next.setDate(next.getDate()+7);$('#nextDoseDate').textContent=fmtDate(next.toISOString().slice(0,10));$('#lastDoseText').textContent=`Última: ${last.dose} mg`}else{$('#nextDoseDate').textContent='—';$('#lastDoseText').textContent='Sin aplicaciones'}
  $('#streakDays').textContent=calcStreak();renderAchievements();drawCharts();
}
function calcStreak(){const dates=new Set([...data.foods.map(x=>x.date),...data.weights.map(x=>x.date),...data.doses.map(x=>x.datetime.slice(0,10)),...data.symptoms.map(x=>x.date)]);let n=0,d=new Date();while(dates.has(d.toISOString().slice(0,10))){n++;d.setDate(d.getDate()-1)}return n}
function renderAchievements(){
  const ws=[...data.weights].sort((a,b)=>a.date.localeCompare(b.date)),lost=ws.length>1?ws[0].weight-ws.at(-1).weight:0;
  const items=[['🔥','Primer registro',data.foods.length+data.weights.length+data.doses.length>0],['⚖️','Primer peso',data.weights.length>0],['💉','Primera dosis',data.doses.length>0],['🏅','1 kg menos',lost>=1],['🏆','5 kg menos',lost>=5],['📆','Racha de 7 días',calcStreak()>=7]];
  $('#achievements').innerHTML=items.map(([i,t,u])=>`<div class="achievement ${u?'unlocked':''}"><span>${i}</span><div><b>${t}</b><small>${u?'Desbloqueado':'Pendiente'}</small></div></div>`).join('');
}
function renderFood(){
  const d=$('#foodDateFilter')?.value||today(),arr=data.foods.filter(x=>x.date===d),sums=k=>arr.reduce((s,x)=>s+(+x[k]||0),0);
  $('#foodSummary').innerHTML=[['kcal',sums('calories')],['Proteína',sums('protein').toFixed(0)+' g'],['Carbos',sums('carbs').toFixed(0)+' g'],['Grasa',sums('fat').toFixed(0)+' g']].map(x=>`<div class="macro"><strong>${x[1]}</strong><span>${x[0]}</span></div>`).join('');
  $('#foodList').innerHTML=arr.length?arr.map(x=>`<div class="list-item"><div><h4>${escapeHtml(x.name)}</h4><p>${x.meal} · ${x.protein||0} g proteína</p></div><div><strong>${x.calories} kcal</strong><button class="delete-btn" onclick="removeItem('foods','${x.id}')">×</button></div></div>`).join(''):'<div class="empty">No hay comidas registradas para este día.</div>';
}
function renderWeight(){
  const arr=[...data.weights].sort((a,b)=>b.date.localeCompare(a.date)),asc=[...arr].reverse(),cur=asc.at(-1),first=asc[0],goal=+data.profile.goalWeight||null;
  $('#goalWeightLabel').textContent=goal?goal.toFixed(1)+' kg':'—';$('#goalProgressLabel').textContent=goal&&cur?Math.max(0,cur.weight-goal).toFixed(1)+' kg por perder':'Configúrala';$('#totalLost').textContent=cur&&first?(first.weight-cur.weight).toFixed(1)+' kg':'—';
  $('#weightList').innerHTML=arr.length?arr.map(x=>`<div class="list-item"><div><h4>${fmtDate(x.date)}</h4><p>${x.waist?`Cintura ${x.waist} cm`:'Sin cintura'}</p></div><div><strong>${x.weight.toFixed(1)} kg</strong><button class="delete-btn" onclick="removeItem('weights','${x.id}')">×</button></div></div>`).join(''):'<div class="empty">Aún no has registrado tu peso.</div>';
}
function renderDose(){
  const arr=[...data.doses].sort((a,b)=>b.datetime.localeCompare(a.datetime));
  $('#doseList').innerHTML=arr.length?arr.map(x=>`<div class="list-item"><div><h4>${x.dose} mg</h4><p>${fmtDateTime(x.datetime)} · ${escapeHtml(x.site)}</p>${x.notes?`<p>${escapeHtml(x.notes)}</p>`:''}</div><button class="delete-btn" onclick="removeItem('doses','${x.id}')">×</button></div>`).join(''):'<div class="empty">Aún no has registrado aplicaciones.</div>';
}
window.removeItem=(collection,id)=>{if(confirm('¿Eliminar este registro?')){data[collection]=data[collection].filter(x=>x.id!==id);save()}}
function drawCharts(){drawLine($('#weightChart'),[...data.weights].sort((a,b)=>a.date.localeCompare(b.date)).slice(-7));drawLine($('#fullWeightChart'),[...data.weights].sort((a,b)=>a.date.localeCompare(b.date)))}
function drawLine(canvas,arr){
  if(!canvas)return;const ctx=canvas.getContext('2d'),dpr=devicePixelRatio||1,w=canvas.clientWidth||300,h=+canvas.getAttribute('height');canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
  ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--border');ctx.lineWidth=1;for(let i=1;i<5;i++){let y=h*i/5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  if(arr.length<2){ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--muted');ctx.font='13px sans-serif';ctx.fillText('Registra al menos dos pesos para ver la gráfica.',12,h/2);return}
  const vals=arr.map(x=>x.weight),min=Math.min(...vals)-1,max=Math.max(...vals)+1,px=i=>18+i*(w-36)/(arr.length-1),py=v=>18+(max-v)*(h-36)/(max-min);
  ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--primary');ctx.lineWidth=4;ctx.lineJoin='round';ctx.beginPath();arr.forEach((x,i)=>i?ctx.lineTo(px(i),py(x.weight)):ctx.moveTo(px(i),py(x.weight)));ctx.stroke();
  ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--primary');arr.forEach((x,i)=>{ctx.beginPath();ctx.arc(px(i),py(x.weight),4,0,Math.PI*2);ctx.fill()})
}
function exportBackup(){download(`mi-progreso-respaldo-${today()}.json`,JSON.stringify(data,null,2),'application/json')}
function importBackup(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const obj=JSON.parse(r.result);if(confirm('Esto reemplazará los datos actuales. ¿Continuar?')){data={...defaultData,...obj};save()}}catch{alert('El archivo no es válido')}};r.readAsText(f)}
function exportCsv(){const rows=[['tipo','fecha','detalle','valor']];data.foods.forEach(x=>rows.push(['comida',x.date,`${x.meal}: ${x.name}`,`${x.calories} kcal`]));data.weights.forEach(x=>rows.push(['peso',x.date,'Peso',`${x.weight} kg`]));data.doses.forEach(x=>rows.push(['dosis',x.datetime,x.site,`${x.dose} mg`]));const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');download(`mi-progreso-${today()}.csv`,csv,'text/csv')}
function download(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function clearData(){if(confirm('¿Borrar definitivamente todos los registros de este dispositivo?')){data=JSON.parse(JSON.stringify(defaultData));save()}}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function registerSW(){if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{})}
