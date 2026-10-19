// figma-taste audit (min). Generated from audit.figma.js by build-min.mjs. Same checks as the full file.
// Edit ROOT_IDS, MIN_IMAGES and SUMMARY on the next lines.
const ROOT_IDS=['ROOT_ID'];
const MIN_IMAGES=4;
const SUMMARY=false;
const results=[];
for(const rootId of ROOT_IDS)results.push(await aR(rootId));
const verdict=results.every(r=>r.verdict==='PASS')?'PASS':'FAIL';
return{verdict,results};
async function aR(ROOT_ID_VALUE){
const ROOT=await figma.getNodeByIdAsync(ROOT_ID_VALUE);
if(!ROOT)return{root:ROOT_ID_VALUE,verdict:'FAIL',error:`node ${ROOT_ID_VALUE} not found`};
{
let p=ROOT;while(p.parent&&p.type!=='PAGE')p=p.parent;
if(p.type==='PAGE'&&p.id!==figma.currentPage.id)await figma.setCurrentPageAsync(p);
}
const fails=[],warns=[];
const F=(rule,n,msg)=>fails.push({rule,id:n?.id,name:n?.name,msg});
const W=(rule,n,msg)=>warns.push({rule,id:n?.id,name:n?.name,msg});
const all=[ROOT,...ROOT.findAll(()=>true)];
const sI=ROOT.parent?.id;
const iA=(n,re)=>{for(let p=n;p&&p.id!==sI;p=p.parent)if(re.test(p.name||''))return true;return false;};
const iI=n=>{for(let p=n.parent;p&&p.id!==sI;p=p.parent)if(p.type==='INSTANCE')return true;return false;};
const iF=n=>iA(n,/^free\//i);
const iU=n=>iA(n,/^ui\//i);
const iC=n=>iA(n,/^code\//i);
const hL=n=>'layoutMode'in n&&n.layoutMode&&n.layoutMode!=='NONE';
const vP=arr=>(Array.isArray(arr)?arr:[]).filter(p=>p.visible!==false);
const hI=n=>vP(n.fills).some(p=>p.type==='IMAGE');
const dN=/^(Frame|Rectangle|Group|Ellipse|Vector|Text|Line|Polygon|Star|Auto layout|Union|Subtract|Component|Instance)( \d+)?$/;
const nS=n=>{
const par=n.parent;if(!par||!('children'in par))return null;
const idx=par.children.findIndex(c=>c.id===n.id);
return idx>=0?par.children[idx+1]||null:null;
};
const iD=n=>/ · dummy$/.test(n.name||'')||(Array.isArray(n.annotations)&&n.annotations.some(a=>(a.label||'').startsWith('Dummy')));
const texts=all.filter(n=>n.type==='TEXT');
const fm=new Map();
const sizes=new Map();
const TI=new Map();
const SC=new Map();
for(const t of texts){
let segs=[];
try{segs=t.getStyledTextSegments(['fontName','fontSize','textCase','letterSpacing','lineHeight']);}catch{segs=[];}
let maxSize=0,mono=false,upper=false,tracked=false,lhPx=null;
for(const s of segs){
fm.set(s.fontName.family,(fm.get(s.fontName.family)||0)+1);
sizes.set(s.fontSize,(sizes.get(s.fontSize)||0)+1);
if(s.fontSize>maxSize){
maxSize=s.fontSize;
lhPx=s.lineHeight.unit==='PIXELS'?s.lineHeight.value:s.lineHeight.unit==='PERCENT'?s.lineHeight.value*s.fontSize/100:s.fontSize*1.2;
}
if(/mono|code|courier|consol/i.test(s.fontName.family))mono=true;
if(s.textCase==='UPPER')upper=true;
const ls=s.letterSpacing;
if((ls.unit==='PERCENT'&&ls.value>2)||(ls.unit==='PIXELS'&&ls.value>0.5))tracked=true;
}
const chars=t.characters||'';
if(!upper&&/[A-Za-z]{3}/.test(chars)&&chars===chars.toUpperCase())upper=true;
let styleName=null;
const sid=t.textStyleId;
if(sid&&sid!==figma.mixed){
if(!SC.has(sid)){const st=await figma.getStyleByIdAsync(sid);SC.set(sid,st?st.name:null);}
styleName=SC.get(sid);
}
const role=styleName?(styleName.match(/(?:^|\/)(Display|Heading|Statement|Quote|Body|Label|Small|Caption)\b/)||[])[1]||null:null;
TI.set(t.id,{maxSize,lhPx,mono,upper,tracked,chars,styleName,role});
}
const sz=n=>TI.get(n.id)?.maxSize||0;
let frames=0,aF=0,loose=0,instances=0,realImages=0,hidden=0,dummyLayers=0;
const uF=[],uS=[],uR=[],uT=[],dX=[];
for(const n of all){
if(n.visible===false){hidden++;continue;}
if(iD(n))dummyLayers++;
const inInst=iI(n);
if(n.type==='INSTANCE')instances++;
if(n.type==='FRAME'||n.type==='COMPONENT'){
frames++;
if(hL(n))aF++;
else if('children'in n&&n.children.length>=2&&!iF(n)&&!inInst){loose++;F('loose-frame',n,`${n.children.length} children placed absolutely; use auto layout or name it free/…`);}
if('children'in n&&n.children.length===1&&n.id!==ROOT.id&&!inInst
&&vP(n.fills).length===0&&vP(n.strokes).length===0
&&(!n.effects||n.effects.length===0)
&&['paddingTop','paddingBottom','paddingLeft','paddingRight'].every(k=>!n[k])
&&!/^(Section|Footer|Nav|image)\b/.test(n.name)){
W('useless-wrapper',n,'one child, no fill, padding or effect; append the child to the parent, and if the wrapper only limited its width, bind the child\'s width to span/N instead');
}
if('children'in n&&n.children.length===0&&vP(n.fills).length===0&&!/^image\//.test(n.name))W('empty-frame',n,'empty frame');
}
if(n.type==='GROUP'&&!iF(n)&&!inInst)W('group',n,'groups do not reflow; use an auto-layout frame');
if(n.layoutPositioning==='ABSOLUTE'&&!/^(free\/|scrim)/i.test(n.name))W('absolute-child',n,'absolute child inside auto layout; name it free/… if intended');
if(dN.test(n.name)&&!inInst)dX.push(n);
if(!inInst&&!iU(n)){
for(const p of vP(n.fills))if(p.type==='SOLID'&&!p.boundVariables?.color){uF.push(n);break;}
for(const p of vP(n.strokes))if(p.type==='SOLID'&&!p.boundVariables?.color){uF.push(n);break;}
if(hL(n)){
const bv=n.boundVariables||{};
const fields=['itemSpacing','paddingTop','paddingBottom','paddingLeft','paddingRight'];
if(n.layoutWrap==='WRAP')fields.push('counterAxisSpacing');
if(n.primaryAxisAlignItems==='SPACE_BETWEEN')fields.splice(fields.indexOf('itemSpacing'),1);
if(fields.some(f=>typeof n[f]==='number'&&n[f]>0&&!bv[f]))uS.push(n);
}
if('cornerRadius'in n){
const bv=n.boundVariables||{};
const r=n.cornerRadius;
const any=r===figma.mixed?['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'].some(k=>n[k]>0):r>0;
const bound=bv.topLeftRadius||bv.topRightRadius||bv.bottomLeftRadius||bv.bottomRightRadius;
if(any&&!bound)uR.push(n);
}
}
if(n.type==='TEXT'&&!inInst){
const sid=n.textStyleId;
if(!sid||sid===figma.mixed)uT.push(n);
}
for(const p of vP(n.fills)){
if(p.type.startsWith('GRADIENT')&&!/scrim/i.test(n.name))F('gradient',n,'gradient fill (only a neutral scrim named "scrim" is allowed)');
}
if(hI(n))realImages++;
for(const e of(n.effects||[]).filter(e=>e.visible!==false)){
if(e.type==='BACKGROUND_BLUR')F('glass',n,'background blur (glass)');
else if((e.type==='DROP_SHADOW'||e.type==='INNER_SHADOW')&&!/menu|dialog|popover|overlay|modal/i.test(n.name)&&!iU(n))W('shadow',n,'shadow on something at rest');
else if(e.type==='LAYER_BLUR')W('blur',n,'layer blur');
}
const sw=typeof n.strokeWeight==='number'?n.strokeWeight:1;
if(!inInst&&!iU(n)&&vP(n.strokes).length&&sw<=1.5&&n.type!=='TEXT'&&!/^field\//i.test(n.name)&&!iA(n,/^field\//i))W('hairline',n,'thin outline or divider; use space or a tone step');
if(n.type==='LINE'&&!iU(n))W('hairline',n,'divider line');
if(n.type==='TEXT'){
const ti=TI.get(n.id);
const chars=ti.chars.trim();
if(ti.mono&&!iC(n))F('monospace',n,'monospace outside code');
if(/^\(?0\d{1,2}\)?[.:/]?$/.test(chars)||/^(step|langkah|tahap)\s*\d+/i.test(chars))F('index-number',n,`index numbering "${chars}"`);
if(ti.maxSize<=14&&ti.upper&&ti.tracked)F('tiny-caps',n,'tiny uppercase letter-spaced label');
if(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(chars.replace(/[©®™]/g,'')))F('emoji',n,'emoji in UI text');
const iH=ti.role?(ti.role==='Display'||ti.role==='Heading'):ti.maxSize>=48;
if(iH&&ti.maxSize>=28&&ti.lhPx){
const lines=Math.round(n.height/ti.lhPx);
if(lines>2)F('headline-lines',n,`headline runs ${lines} lines at ${ti.maxSize}px`);
}
const par=n.parent;
if(par&&'children'in par&&par.layoutMode==='VERTICAL'&&ti.maxSize<=16&&chars.length>0&&chars.length<=40){
const next=nS(n);
if(next&&next.type==='TEXT'&&sz(next)>=Math.max(32,ti.maxSize*1.8))F('eyebrow',n,`label "${chars}" above a heading`);
}
}
if((n.type==='FRAME'||n.type==='INSTANCE')&&n.parent?.layoutMode==='VERTICAL'&&n.height<=40){
const r=typeof n.cornerRadius==='number'?n.cornerRadius:0;
const sT='children'in n&&n.children.some(c=>c.type==='TEXT'&&sz(c)<=14);
const next=nS(n);
if(r>=n.height/2-1&&sT&&next&&next.type==='TEXT'&&sz(next)>=32)F('pill-badge',n,'pill badge above a heading');
}
if(/^image\//i.test(n.name)&&!hI(n))F('empty-image-slot',n,'image slot without a photograph');
}
const list=arr=>arr.slice(0,12).map(n=>`${n.name} (${n.id})`).join(', ');
if(uF.length)F('unbound-colour',uF[0],`${uF.length} nodes with raw colours: ${list(uF)}`);
if(uS.length)F('unbound-spacing',uS[0],`${uS.length} auto-layout frames with raw gap/padding: ${list(uS)}`);
if(uR.length)W('unbound-radius',uR[0],`${uR.length} nodes with raw radius: ${list(uR)}`);
if(uT.length)F('unstyled-text',uT[0],`${uT.length} text layers without a text style: ${list(uT)}`);
if(dX.length)W('default-names',dX[0],`${dX.length} default layer names: ${list(dX)}`);
if(fm.size>2)F('type-families',ROOT,`${fm.size} typefaces: ${[...fm.keys()].join(', ')}`);
if(sizes.size>7)W('type-sizes',ROOT,`${sizes.size} font sizes: ${[...sizes.keys()].sort((a,b)=>b-a).join(', ')}`);
function sig(n,depth=0){
if(depth>3)return'';
const bucket=k=>(k>=4?'4+':String(k));
if(n.type==='TEXT')return sz(n)>=28?'H':'t';
if(n.type==='RECTANGLE')return hI(n)||/^image\//.test(n.name)?'img':'r';
if(n.type==='INSTANCE')return`I:${n.mainComponent?.parent?.type==='COMPONENT_SET'?n.mainComponent.parent.name:n.mainComponent?.name}`;
if(!('children'in n))return n.type[0];
const kids=n.children.filter(c=>c.visible!==false&&!/^scrim/i.test(c.name));
const parts=[];
for(const k of kids){const s=sig(k,depth+1);if(parts[parts.length-1]?.s===s)parts[parts.length-1].c++;else parts.push({s,c:1});}
const mode=n.layoutMode||'NONE';
const g=mode==='GRID'?`${n.gridColumnCount}x${n.gridRowCount}`:'';
return`${mode[0]}${n.layoutWrap==='WRAP'?'w':''}${g}${hI(n)?'*':''}(${parts.map(p=>p.c>1?`${p.s}x${bucket(p.c)}`:p.s).join(',')})`;
}
const sc=ROOT.children.filter(c=>c.visible!==false&&!/^nav/i.test(c.name));
const sigs=sc.map(s=>({s,sig:sig(s)}));
for(let i=1;i<sigs.length;i++){
if(sigs[i].sig===sigs[i-1].sig)F('repeat-adjacent',sigs[i].s,`same composition as the section above (${sigs[i-1].s.name})`);
}
const seen=new Map();
for(const x of sigs){if(seen.has(x.sig))W('repeat',x.s,`same composition as ${seen.get(x.sig).name}`);else seen.set(x.sig,x.s);}
const cN=k=>k.type==='INSTANCE'?(k.mainComponent?.parent?.type==='COMPONENT_SET'?k.mainComponent.parent.name:k.mainComponent?.name)||'':'';
for(const n of all){
if(!hL(n)||!('children'in n)||iU(n)||iI(n))continue;
if(/^(Clients|Logos)\//i.test(n.name))continue;
const kids=n.children.filter(c=>c.visible!==false&&(c.type==='FRAME'||c.type==='INSTANCE'||c.type==='COMPONENT'));
if(kids.length<3||kids.length!==n.children.filter(c=>c.visible!==false).length)continue;
if(kids.every(k=>/^Logo\//i.test(cN(k))||/^Logo\//i.test(k.name)))continue;
const ks=kids.map(k=>sig(k,1));
if(!ks.every(s=>s===ks[0]))continue;
const iL=kids.every(k=>{
const first=k.findOne?.(d=>['VECTOR','ELLIPSE','BOOLEAN_OPERATION','STAR','POLYGON'].includes(d.type)||(/icon/i.test(d.name)&&d.width<=72));
return first&&first.width<=72&&!k.findOne(d=>hI(d));
});
const cd=kids.every(k=>vP(k.fills).length||vP(k.strokes).length);
if(iL)F('icon-cards',n,`${kids.length} identical cards with icons`);
else if(cd&&!kids.some(k=>k.findOne?.(d=>hI(d)||/^image\//.test(d.name))))W('card-row',n,`${kids.length} identical filled cards; check the dealt composition`);
}
const first=sc.find(s=>!/^nav/i.test(s.name));
if(first&&!first.findOne?.(d=>d.type==='TEXT'&&sz(d)>=40))F('no-title',first,'first screen has no title set large');
for(const s of sc){
if(/footer/i.test(s.name))continue;
if(s.type!=='TEXT'&&!s.findOne?.(d=>d.type==='TEXT'&&sz(d)>=28))W('untitled-section',s,'section without a heading');
if(hL(s)&&(s.paddingLeft||s.paddingRight)&&s.paddingLeft!==s.paddingRight&&!/free\//.test(s.name))F('unequal-margins',s,`padding left ${s.paddingLeft} ≠ right ${s.paddingRight}`);
}
const grid=(ROOT.layoutGrids||[]).find(g=>g.pattern==='COLUMNS'&&g.visible!==false);
let offGrid=0;
if(grid&&grid.alignment==='STRETCH'){
const Wd=ROOT.width,cols=grid.count,gut=grid.gutterSize,mar=grid.offset;
const col=(Wd-2*mar-(cols-1)*gut)/cols;
const st=Array.from({length:cols},(_,k)=>mar+k*(col+gut));
const en=st.map(s=>s+col);
const nr=(x,arr)=>arr.some(a=>Math.abs(a-x)<=1);
const rX=ROOT.absoluteTransform[0][2];
const fB=n=>n.width>=Wd-1;
const ck=(n,cR)=>{
if(n.visible===false||iF(n)||/^scrim/i.test(n.name)||n.layoutPositioning==='ABSOLUTE'||fB(n))return;
const x=n.absoluteTransform[0][2]-rX;
const r=x+n.width;
if(!nr(x,st)){offGrid++;W('off-grid',n,`left edge at ${x.toFixed(1)} is not on a column start`);}
else if(cR&&n.layoutSizingHorizontal!=='HUG'&&!nr(r,en)){offGrid++;W('off-grid',n,`right edge at ${r.toFixed(1)} is not on a column end`);}
};
for(const s of sc){
if(!('children'in s))continue;
for(const c of s.children){
ck(c,false);
const iS='children'in c&&(c.layoutMode==='HORIZONTAL'||c.layoutMode==='GRID')
&&c.layoutWrap!=='WRAP'&&c.primaryAxisAlignItems!=='SPACE_BETWEEN'
&&c.children.filter(k=>k.visible!==false&&k.layoutPositioning!=='ABSOLUTE').length>=2;
if(iS)for(const k of c.children)ck(k,true);
}
}
}else if(!grid){
W('no-layout-grid',ROOT,'page wrapper has no column layout grid; add it with columnGrid()');
}
if(realImages<MIN_IMAGES)F('image-floor',ROOT,`${realImages} real photographs; at least ${MIN_IMAGES} needed`);
const stats={
nodes:all.length,hidden,frames,autoLayoutFrames:aF,
autoLayoutRatio:frames?+(aF/frames).toFixed(2):1,
looseFrames:loose,instances,texts:texts.length,unstyledTexts:uT.length,
realImages,dummyLayers,offGrid,height:Math.round(ROOT.height),
sectionHeightSum:Math.round(sc.reduce((a,s)=>a+s.height,0)),
typefaces:[...fm.keys()],fontSizes:[...sizes.keys()].sort((a,b)=>b-a),
};
const v=fails.length?'FAIL':'PASS';
if(SUMMARY){
return{
root:`${ROOT.name} (${ROOT.id})`,verdict:v,fails:fails.length,warns:warns.length,
failList:fails.slice(0,30).map(f=>`${f.rule} · ${f.name}: ${String(f.msg).slice(0,90)}`),
stats:{realImages,dummyLayers,offGrid,autoLayoutRatio:stats.autoLayoutRatio,height:stats.height,typefaces:stats.typefaces},
};
}
return{
root:`${ROOT.name} (${ROOT.id})`,verdict:v,
counts:{fails:fails.length,warns:warns.length},
fails:fails.slice(0,60),warns:warns.slice(0,60),
stats:{...stats,sections:sigs.map(x=>({name:x.s.name,height:Math.round(x.s.height),sig:x.sig.slice(0,80)}))},
};
}
