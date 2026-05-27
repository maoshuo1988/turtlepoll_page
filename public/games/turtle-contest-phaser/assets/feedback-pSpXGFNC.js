const f=[];function h(){const o=e=>{f.push(e.slice(0,600)),f.length>40&&f.shift()},n=console.error.bind(console);console.error=(...e)=>{try{o("[error] "+e.map(t=>typeof t=="string"?t:t instanceof Error?t.stack||t.message:JSON.stringify(t)).join(" "))}catch{}n(...e)},window.addEventListener("error",e=>o(`[window.onerror] ${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`)),window.addEventListener("unhandledrejection",e=>o("[unhandledrejection] "+String(e.reason)))}function g(o){const n={time:new Date().toISOString(),url:location.href,viewport:{w:window.innerWidth,h:window.innerHeight},recentErrors:f.slice(-15)};try{n.activeScenes=o.scene.scenes.filter(t=>t.scene.isActive()).map(t=>t.scene.key);const e=o.scene.getScene("BattleScene");e&&o.scene.isActive("BattleScene")&&Array.isArray(e.views)&&(n.battle={turn:e.turn,mode:e.mode,coins:e.coins,fighters:e.views.map(t=>{const r=t.fighter;return{name:r.name,side:r.side,hp:r.hp,maxHp:r.maxHp,alive:r.alive,passive:r.passive?.type,slot:r._slotKey,pos:r._position,buffs:(r.buffs??[]).map(i=>`${i.type}:${i.value}/${i.duration}`)}})})}catch(e){n.gatherError=String(e)}return n}function y(o){return new Promise(n=>{try{o.renderer.snapshot(e=>{n(e instanceof HTMLImageElement?e.src:null)}),setTimeout(()=>n(null),1500)}catch{n(null)}})}let u=!1;function m(){if(u)return;u=!0;const o=document.createElement("style");o.textContent=`
    /* v0.9.9 阶段0: 反馈是开发工具 → 右下角缩成小图标 + 半透明, 玩家无感 (hover 才显形) */
    #poc-fb-btn {
      position: fixed; right: 8px; bottom: 8px; z-index: 9000;
      background: rgba(20,24,34,.6); color: #ffd93d; border: 1px solid rgba(255,217,61,.3);
      border-radius: 7px; padding: 3px 6px; font-size: 11px; cursor: pointer;
      font-family: 'Segoe UI', system-ui, sans-serif; backdrop-filter: blur(4px);
      opacity: .25; transition: opacity .15s;
    }
    #poc-fb-btn:hover { background: rgba(40,46,60,.95); opacity: .95; }
    #poc-fb-modal {
      position: fixed; inset: 0; z-index: 9001; display: none;
      background: rgba(0,0,0,.55); align-items: center; justify-content: center;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    #poc-fb-modal.show { display: flex; }
    #poc-fb-card {
      background: #0f1420; color: #e6edf3; border: 1px solid rgba(255,255,255,.12);
      border-radius: 12px; padding: 16px; width: min(560px, 92vw); max-height: 88vh; overflow-y: auto;
    }
    #poc-fb-card h3 { margin: 0 0 8px; font-size: 16px; }
    #poc-fb-card .fb-hint { font-size: 12px; color: #8b949e; margin-bottom: 8px; }
    #poc-fb-card textarea {
      width: 100%; min-height: 90px; box-sizing: border-box; resize: vertical;
      background: rgba(255,255,255,.05); color: #e6edf3; border: 1px solid rgba(255,255,255,.15);
      border-radius: 6px; padding: 8px; font-size: 13px; font-family: inherit;
    }
    #poc-fb-card .fb-shot { width: 100%; border-radius: 6px; margin: 8px 0; border: 1px solid rgba(255,255,255,.1); }
    #poc-fb-card .fb-ctx {
      font-size: 11px; color: #8b949e; background: rgba(255,255,255,.03); border-radius: 6px;
      padding: 8px; max-height: 140px; overflow: auto; white-space: pre-wrap; word-break: break-all; margin: 8px 0;
    }
    #poc-fb-card .fb-row { display: flex; gap: 8px; margin-top: 10px; }
    #poc-fb-card button {
      flex: 1; padding: 8px; border-radius: 6px; border: none; cursor: pointer;
      font-size: 13px; font-family: inherit; font-weight: 600;
    }
    #poc-fb-card .fb-copy { background: #58a6ff; color: #fff; }
    #poc-fb-card .fb-dl { background: #06d6a0; color: #04231b; }
    #poc-fb-card .fb-close { background: rgba(255,255,255,.1); color: #e6edf3; }
    #poc-fb-card .fb-ok { font-size: 12px; color: #06d6a0; margin-top: 6px; min-height: 16px; }
  `,document.head.appendChild(o)}function w(o){h(),m();const n=document.createElement("button");n.id="poc-fb-btn",n.textContent="🐛 反馈 (F11)",document.body.appendChild(n);const e=document.createElement("div");e.id="poc-fb-modal",e.innerHTML=`
    <div id="poc-fb-card">
      <h3>🐛 问题反馈</h3>
      <div class="fb-hint">描述你看到的问题（哪只龟、放了什么、预期 vs 实际）。会自动附带当前战斗状态 + 截图 + 最近报错。</div>
      <textarea id="poc-fb-text" placeholder="例: 竹叶龟竹击打后排敌人，没有被击至前排（前排有空位）"></textarea>
      <img id="poc-fb-shot" class="fb-shot" alt="" style="display:none">
      <div class="fb-ctx" id="poc-fb-ctx"></div>
      <div class="fb-row">
        <button class="fb-copy" data-act="copy">📋 复制到剪贴板</button>
        <button class="fb-dl" data-act="download">⬇ 下载 JSON</button>
        <button class="fb-close" data-act="close">关闭</button>
      </div>
      <div class="fb-ok" id="poc-fb-ok"></div>
    </div>
  `,document.body.appendChild(e);const t=e.querySelector("#poc-fb-text"),r=e.querySelector("#poc-fb-ctx"),i=e.querySelector("#poc-fb-shot"),a=e.querySelector("#poc-fb-ok");let s={},d=null;const b=async()=>{s=g(o),r.textContent=JSON.stringify(s,null,2),a.textContent="",e.classList.add("show"),t.focus(),d=await y(o),d?(i.src=d,i.style.display="block"):i.style.display="none"},l=()=>e.classList.remove("show"),x=()=>({description:t.value.trim(),context:s,screenshot:d});n.onclick=b,e.querySelector('[data-act="close"]').addEventListener("click",l),e.addEventListener("click",c=>{c.target===e&&l()}),e.querySelector('[data-act="copy"]').addEventListener("click",async()=>{const c=`# 反馈
${t.value.trim()}

## context
${JSON.stringify(s,null,2)}`;try{await navigator.clipboard.writeText(c),a.textContent="✓ 已复制 (含状态/报错; 截图请用下载)"}catch{a.textContent="✗ 复制失败, 请用下载"}}),e.querySelector('[data-act="download"]').addEventListener("click",()=>{const c=new Blob([JSON.stringify(x(),null,2)],{type:"application/json"}),p=document.createElement("a");p.href=URL.createObjectURL(c),p.download=`feedback-${Date.now()}.json`,p.click(),setTimeout(()=>URL.revokeObjectURL(p.href),2e3),a.textContent="✓ 已下载 (含截图), 把文件发给开发者"}),window.addEventListener("keydown",c=>{c.key==="F11"?(c.preventDefault(),e.classList.contains("show")?l():b()):c.key==="Escape"&&e.classList.contains("show")&&l()})}export{w as initFeedback};
