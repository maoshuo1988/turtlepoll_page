const b=`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' shape-rendering='crispEdges'>
<g fill='#ffe9b0'><rect x='4' y='0' width='2' height='4'/><rect x='10' y='0' width='2' height='4'/><rect x='16' y='0' width='2' height='4'/></g>
<g fill='#1f6b3f'><rect x='2' y='4' width='18' height='2'/><rect x='2' y='6' width='2' height='2'/><rect x='18' y='6' width='2' height='2'/><rect x='0' y='8' width='4' height='2'/><rect x='20' y='8' width='2' height='2'/><rect x='0' y='10' width='2' height='2'/><rect x='20' y='10' width='2' height='2'/><rect x='0' y='12' width='2' height='2'/><rect x='20' y='12' width='2' height='2'/><rect x='0' y='14' width='2' height='2'/><rect x='20' y='14' width='2' height='2'/><rect x='2' y='16' width='2' height='2'/><rect x='18' y='16' width='2' height='2'/><rect x='2' y='18' width='2' height='2'/><rect x='18' y='18' width='2' height='2'/><rect x='4' y='20' width='2' height='2'/><rect x='16' y='20' width='2' height='2'/><rect x='6' y='22' width='10' height='2'/></g>
<g fill='#3cba6e'><rect x='4' y='6' width='6' height='2'/><rect x='12' y='6' width='6' height='2'/><rect x='4' y='8' width='6' height='2'/><rect x='12' y='8' width='8' height='2'/><rect x='2' y='10' width='8' height='2'/><rect x='12' y='10' width='8' height='2'/><rect x='2' y='12' width='2' height='2'/><rect x='8' y='12' width='12' height='2'/><rect x='2' y='14' width='18' height='2'/><rect x='4' y='16' width='14' height='2'/><rect x='4' y='18' width='14' height='2'/><rect x='6' y='20' width='10' height='2'/></g>
<g fill='#7fe6a0'><rect x='10' y='6' width='2' height='2'/><rect x='10' y='8' width='2' height='2'/><rect x='10' y='10' width='2' height='2'/><rect x='4' y='12' width='4' height='2'/></g></svg>`,v=`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='22' shape-rendering='crispEdges'>
<g fill='#1f6b3f'><rect x='6' y='2' width='10' height='2'/><rect x='2' y='4' width='4' height='2'/><rect x='16' y='4' width='4' height='2'/><rect x='0' y='6' width='2' height='2'/><rect x='20' y='6' width='2' height='2'/><rect x='0' y='8' width='2' height='2'/><rect x='20' y='8' width='2' height='2'/><rect x='0' y='10' width='2' height='2'/><rect x='20' y='10' width='2' height='2'/><rect x='0' y='12' width='2' height='2'/><rect x='20' y='12' width='2' height='2'/><rect x='2' y='14' width='2' height='2'/><rect x='18' y='14' width='2' height='2'/><rect x='4' y='16' width='2' height='2'/><rect x='16' y='16' width='2' height='2'/><rect x='6' y='18' width='10' height='2'/></g>
<g fill='#3cba6e'><rect x='6' y='4' width='10' height='2'/><rect x='2' y='6' width='18' height='2'/><rect x='2' y='8' width='8' height='2'/><rect x='12' y='8' width='8' height='2'/><rect x='2' y='10' width='18' height='2'/><rect x='2' y='12' width='18' height='2'/><rect x='4' y='14' width='14' height='2'/><rect x='6' y='16' width='10' height='2'/></g>
<g fill='#7fe6a0'><rect x='10' y='8' width='2' height='2'/><rect x='4' y='6' width='4' height='2'/></g></svg>`,p=c=>`url("data:image/svg+xml,${encodeURIComponent(c)}")`;let x=!1;function L(){if(x)return;x=!0;const c=window.matchMedia?.("(pointer: fine)").matches??!0,d=document.createElement("style");d.textContent=`
    html.poc-jscursor, html.poc-jscursor * { cursor: none !important; }
    #poc-cursor {
      position: fixed; left: 0; top: 0; width: 26px; height: 26px;
      pointer-events: none; z-index: 2147483647;
      will-change: transform; transform: translate3d(-100px,-100px,0);
    }
    #poc-cursor .g {
      width: 100%; height: 100%;
      background: ${p(b)} no-repeat center / contain;
      image-rendering: pixelated;
      transform-origin: 46% 6%;   /* 以中间爪尖附近为缩放锚 */
      transition: transform .08s ease-out, filter .12s ease;
    }
    /* 可点: 放大 + 青色发光 + 悬停微浮 */
    #poc-cursor.is-pointer .g {
      filter: drop-shadow(0 0 5px rgba(126,224,255,.9));
      animation: pocCurBob .9s ease-in-out infinite;
    }
    @keyframes pocCurBob { 0%,100%{transform:scale(1.12) translateY(0)} 50%{transform:scale(1.12) translateY(-2px)} }
    /* 按下: 收一下 */
    #poc-cursor.is-press .g { transform: scale(.8) !important; animation: none !important; }
    /* 抓取/握拳: 换拳贴图 */
    #poc-cursor.is-grab .g, #poc-cursor.is-grabbing .g {
      background-image: ${p(v)};
      animation: none;
    }
    #poc-cursor.is-grabbing .g { transform: scale(.9); filter: drop-shadow(0 0 5px rgba(126,224,255,.9)); }
    /* 禁用: 红化 + 收 */
    #poc-cursor.is-disabled .g {
      filter: grayscale(1) brightness(.7) sepia(1) hue-rotate(-35deg) saturate(4);
      animation: none;
    }
  `,document.head.appendChild(d);const e=document.createElement("div");e.id="poc-cursor";const g=document.createElement("div");g.className="g",e.appendChild(g),document.body.appendChild(e);const u=11,y=1;let a=!1;const r=t=>{t!==a&&(a=t,e.style.opacity=t?"1":"0",document.documentElement.classList.toggle("poc-jscursor",t))},f=t=>{let i=t;for(let w=0;w<4&&i;w++,i=i.parentElement){const h=i.getAttribute?.("style")??"";if(i.disabled||h.includes("not-allowed"))return"disabled";if(h.includes("grabbing"))return"grabbing";if(h.includes("grab"))return"grab";if(h.includes("cursor:pointer")||h.includes("cursor: pointer"))return"pointer";if(typeof i.matches=="function"&&i.matches('a,button,summary,[role="button"],input[type="button"],input[type="submit"],label[for],canvas'))return i.tagName==="CANVAS"?i.style.cursor.includes("pointer")?"pointer":"default":"pointer"}return"default"};let s=!1;const o=t=>{e.classList.toggle("is-pointer",t==="pointer"&&!s),e.classList.toggle("is-grab",t==="grab"&&!s),e.classList.toggle("is-grabbing",t==="grabbing"),e.classList.toggle("is-disabled",t==="disabled")};let n="default";const m=t=>{if(t.pointerType==="touch"){r(!1);return}r(!0),e.style.transform=`translate3d(${t.clientX-u}px, ${t.clientY-y}px, 0)`,n=f(t.target),o(n)};window.addEventListener("pointermove",m,{passive:!0}),window.addEventListener("pointerdown",t=>{t.pointerType!=="touch"&&(s=!0,n==="grab"?o("grabbing"):e.classList.add("is-press"))},{passive:!0});const l=()=>{s=!1,e.classList.remove("is-press"),o(n)};window.addEventListener("pointerup",l,{passive:!0}),window.addEventListener("pointercancel",l,{passive:!0}),document.addEventListener("mouseleave",()=>r(!1)),window.addEventListener("blur",()=>r(!1)),c&&r(!1)}export{L as initCursor};
