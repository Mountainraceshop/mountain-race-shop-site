'use strict';
(() => {
 const $ = id => document.getElementById(id);
 const make=$('make'),year=$('year'),model=$('model'),status=$('load-status');
 let catalogue,active={},request=0;
 const present=v=>v!==null&&v!==undefined&&v!=='';
 const plainModel=v=>String(v).replace(/\s+20\d\d(?:\s*[-–]\s*20\d\d)?$/,'');
 function modelKey(v){let s=plainModel(v).toUpperCase().replace(/[^A-Z0-9]/g,'');if(make.value==='Suzuki')s=s.replace(/^(RM[ZX]\d+)F$/,'$1');const m=s.match(/^([A-Z]+)(\d+)(.*)$/);return m?m[2]+m[1]+m[3]:s;}
 const records=kind=>active[kind]?.records||[];
 function applies(r,kind,y){const a=r.values[1],b=kind==='springs'?r.values[2]:a;return y==='unknown'?typeof a!=='number':typeof a==='number'&&typeof b==='number'&&Number(y)>=a&&Number(y)<=b;}
 function options(select,items,prompt){select.replaceChildren(new Option(prompt,''),...items.map(([v,t])=>new Option(t,v)));select.disabled=items.length===0;}
 function clearResult(){$('result').hidden=true;}
 function years(){const ys=new Set();for(const kind of Object.keys(active))for(const r of records(kind)){const a=r.values[1],b=kind==='springs'?r.values[2]:a;if(typeof a==='number'&&typeof b==='number'){for(let y=Math.max(a,2000);y<=Math.min(b,2027);y++)ys.add(String(y));}else ys.add('unknown');}return [...ys].sort((a,b)=>(Number(b)||0)-(Number(a)||0)).map(y=>[y,y==='unknown'?'Year not specified':y]);}
 async function loadMake(){const ticket=++request;active={};clearResult();options(year,[],'Loading years…');options(model,[],'Choose year first');if(!make.value){status.textContent='Choose a manufacturer.';return;}status.textContent='Loading '+make.value+'…';try{const entry=catalogue.manufacturers.find(x=>x.name===make.value);const response=await fetch('data/'+entry.file);if(!response.ok)throw Error('load');const data=await response.json();if(ticket!==request)return;active=data;options(year,years(),'Choose year');status.textContent='Choose a year, then a model. Years are listed newest first.';}catch(e){if(ticket===request)status.textContent='Could not load this manufacturer. Please refresh and try again.';}}
 function loadModels(){clearResult();const map=new Map();for(const kind of ['setup','parts','springs'])for(const r of records(kind))if(applies(r,kind,year.value)){const text=plainModel(r.values[0]),key=modelKey(text);if(!map.has(key))map.set(key,text);}options(model,[...map].sort((a,b)=>a[1].localeCompare(b[1],undefined,{numeric:true})),'Choose model');status.textContent=map.size?map.size+' model names or supplier model groups available.':'No entries recorded for this selection.';}
 function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
 function item(dl,label,value,note,wide=false){const box=node('div',undefined,(wide?'wide ':'')+(!present(value)?'empty':''));box.append(node('dt',label),node('dd',present(value)?String(value):'Not recorded'));if(note){const details=node('details');details.append(node('summary','Fitment notes'),node('p',note));box.append(details);}dl.append(box);}
 function selected(kind){return records(kind).filter(r=>applies(r,kind,year.value)&&modelKey(r.values[0])===model.value);}
 function section(kind,rows){const host=document.querySelector('#'+kind+' .section-content');host.replaceChildren();if(!rows.length){host.append(node('p','No '+(kind==='setup'?'setup or specifications':kind==='parts'?'part numbers':'weight chart')+' recorded for this exact model and year. Broader supplier model groups may be listed separately in the model menu.','empty-message'));return;}
  for(const [index,r] of rows.entries()){
   const headers=active[kind].headers,v=r.values,card=node('article',undefined,'data-card');host.append(card);
   if(kind==='setup'){
    card.append(node('h3',rows.length>1?'Recorded baseline '+(index+1):'Recorded bike information'));if(rows.length>1)card.append(node('p','Read the notes for this baseline before combining settings from different publishers or editions.','small'));
    const dl=node('dl',undefined,'data-grid');for(let i=2;i<headers.length;i++)item(dl,headers[i],v[i],null,/note|change|status|basis|options|kits/i.test(headers[i]));card.append(dl);
   }else if(kind==='parts'){
    const groups=[['K-Tech',2,13],['SKF',13,14],['Öhlins',14,17],['Lainer',17,22],['All Balls',22,25],['EBC',25,27]];
    card.append(node('h3',v[0]+' · '+v[1]));let found=0;
    for(const [brand,start,end] of groups){if(!v.slice(start,end).some(present))continue;found++;card.append(node('h3',brand));const dl=node('dl',undefined,'data-grid');for(let i=start;i<end;i++)if(present(v[i]))item(dl,headers[i],v[i],r.notes?.[i]);card.append(dl);}
    if(!found)card.append(node('p','No part numbers recorded.','empty-message'));
   }else{
    card.append(node('h3',v[3]+' · '+v[0]));const dl=node('dl',undefined,'data-grid');for(let i=4;i<=20;i++)if(present(v[i]))item(dl,headers[i],v[i]);if(!v.slice(4,21).some(present))card.append(node('p','Rider-weight recommendations are not recorded for this chart.','empty-message'));item(dl,'Chart-listed standard rate (N/mm)',v[21]);item(dl,'Chart status',v[22],null,true);item(dl,'Weight basis, conversions and chart notes',v[23],null,true);card.append(dl);
   }
  }
 }
 function show(){if(!model.value){clearResult();return;}const a=selected('setup'),b=selected('parts'),c=selected('springs');$('bike-title').textContent=make.value+' '+model.selectedOptions[0].text+' · '+(year.value==='unknown'?'year not specified':year.value);$('selection-summary').textContent=a.length+' setup/specification record(s), '+b.length+' parts record(s), '+c.length+' spring chart(s). “Not recorded” means this edition does not verify the value.';section('setup',a);section('parts',b);section('springs',c);$('result').hidden=false;status.textContent='Showing the selected bike. Browse the three sections below.';const u=new URL(location.href);u.searchParams.set('make',make.value);u.searchParams.set('year',year.value);u.searchParams.set('model',model.value);history.replaceState(null,'',u);}
 make.addEventListener('change',loadMake);year.addEventListener('change',loadModels);model.addEventListener('change',show);
 async function init(){try{const response=await fetch('data/index.json');if(!response.ok)throw Error('load');catalogue=await response.json();options(make,catalogue.manufacturers.map(m=>[m.name,m.name]),'Choose manufacturer');status.textContent='Choose a manufacturer to begin.';const p=new URLSearchParams(location.search);if(catalogue.manufacturers.some(m=>m.name===p.get('make'))){make.value=p.get('make');await loadMake();year.value=p.get('year')||'';if(year.value){loadModels();model.value=p.get('model')||'';if(model.value)show();}}}catch(e){status.textContent='The database could not load. Please refresh or text Craig on 0420 947 505.';}}
 async function checkout(){try{const r=await fetch('purchase.json');if(!r.ok)return;const p=await r.json();if(!p.url||p.currency!=='AUD'||p.amount!==1000)return;const u=new URL(p.url);if(u.origin!=='https://payhip.com'||!u.pathname.startsWith('/b/'))return;const a=node('a','Download Excel — A$10','button');a.href=u.href;const note=node('p','Secure Payhip checkout. Your Excel download is supplied after payment.','small');$('purchase-action').replaceChildren(a,note);}catch(e){/* Keep the truthful pending status when checkout is unavailable. */}}
 init();checkout();
})();
