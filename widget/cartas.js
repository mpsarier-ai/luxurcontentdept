/* LUXUR · juego de cartas: pestaña lateral + popup (se carga desde el tema de Shopify) */
(function(){
  if (window.__lxCartas) return; window.__lxCartas = true;
  try { var pj = document.createElement('script'); pj.src = 'https://ops.luxurjeans.com/widget/precios.js?v=1127'; pj.defer = true; document.head.appendChild(pj); } catch(e){}
  /* home en modo black friday: jue 26 y vie 27 */
  try {
    var hn = new Date();
    if (location.pathname === '/' && hn >= new Date('2026-11-26T14:00:00Z') && hn < new Date('2026-11-28T04:59:00Z')){
      var hs = document.createElement('style'); hs.textContent = 'main > .shopify-section{display:none!important}#lxbf-home{display:block}'; document.head.appendChild(hs);
      var hl = document.createElement('link'); hl.rel = 'stylesheet'; hl.href = 'https://ops.luxurjeans.com/bf/bf.css?v=1127'; document.head.appendChild(hl);
      if (!document.querySelector('link[href*="family=Poppins"]')){ var gf = document.createElement('link'); gf.rel = 'stylesheet'; gf.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'; document.head.appendChild(gf); }
      var mount = function(){
        var mn = document.querySelector('main'); if (!mn || document.getElementById('lxbf-home')) return;
        var w = document.createElement('div'); w.id = 'lxbf-home'; w.innerHTML = '<div id="lxbf-mount"></div>'; mn.insertBefore(w, mn.firstChild);
        var bs = document.createElement('script'); bs.src = 'https://ops.luxurjeans.com/bf/bf.js?v=1127'; document.body.appendChild(bs);
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
    }
  } catch(e){}
  var END = new Date('2026-11-28T04:59:00Z');
  if (new Date() > END) return;
  var p = location.pathname;
  if (/\/(cart|checkouts?|account|pages\/luxur-club|pages\/black-friday)/.test(p)) return;
  var GAME = 'https://ops.luxurjeans.com/cartas?embed=1';
  var now = new Date();
  var VIE = now >= new Date('2026-11-27T05:00:00Z') && now < new Date('2026-11-28T04:59:00Z');
  var JUE = now >= new Date('2026-11-26T14:00:00Z') && now < new Date('2026-11-27T04:59:00Z');
  var HOY = VIE || JUE || (now >= new Date('2026-11-23T18:20:00Z') && now < new Date('2026-11-24T04:59:00Z'));
  var HP = VIE ? '30' : JUE ? '20' : '15', HC = VIE ? '' : JUE ? '30%</b> desde las 7 p. m.' : '20%</b>';
  var FINDE = HOY || (now >= new Date('2026-11-20T05:00:00Z') && now < new Date('2026-11-23T04:59:00Z'));
  var SHOP = '/pages/black-friday';
  var LAST = !HOY && FINDE && now >= new Date('2026-11-22T05:00:00Z');
  var css = '.lxk-tab{position:fixed;left:0;top:50%;z-index:2147483000;transform:translateY(-50%) rotate(180deg);writing-mode:vertical-rl;background:#1C1C1C;color:#FBFAF7;border:1px solid #E3A7AE;border-right:0;border-radius:14px 0 0 14px;padding:16px 9px;font:600 11px/1 Poppins,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25)}'
    + '.lxk-tab b{color:#E3A7AE;font-weight:600}'
    + '.lxk-ov{position:fixed;inset:0;z-index:2147483001;background:rgba(28,28,28,.72);display:none;align-items:center;justify-content:center;padding:12px}'
    + '.lxk-ov.on{display:flex}'
    + '.lxk-box{position:relative;width:min(440px,100%);height:min(720px,92vh);border-radius:22px;overflow:hidden;background:#1C1C1C;box-shadow:0 30px 80px rgba(0,0,0,.5)}'
    + '.lxk-box iframe{width:100%;height:100%;border:0;display:block}'
    + '.lxk-promo{height:auto!important;padding:54px 26px 30px;text-align:center;color:#FBFAF7;font-family:Poppins,Helvetica,Arial,sans-serif;background:radial-gradient(80% 60% at 50% 0%,rgba(227,167,174,.5),transparent 70%),#1C1C1C}'
    + '.lxk-promo .k{font-weight:600;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#E3A7AE}'
    + '.lxk-promo .n{font-weight:300;font-size:112px;line-height:1;letter-spacing:-.04em;color:#EECDCC;margin:6px 0 0}'
    + '.lxk-promo .t{font-weight:300;font-size:30px;line-height:1.1;letter-spacing:-.02em;margin:4px 0 0}'
    + '.lxk-promo .s{font-size:14px;line-height:1.5;color:#d8d2ca;margin:14px auto 0;max-width:300px}'
    + '.lxk-promo a.b{display:block;margin:22px auto 0;max-width:300px;padding:16px;border-radius:999px;background:#EECDCC;color:#1C1C1C!important;font-weight:600;font-size:12px;letter-spacing:.14em;text-transform:uppercase;text-decoration:none!important}'
    + '.lxk-promo .c{margin:18px auto 0;max-width:300px;padding:14px 16px;border:1px solid rgba(227,167,174,.4);border-radius:16px;font-size:13px;line-height:1.45;color:#FBFAF7}'
    + '.lxk-promo .c a{color:#E3A7AE!important;text-decoration:underline!important}'
    + '.lxk-x{position:absolute;top:10px;right:10px;z-index:2;width:36px;height:36px;border-radius:999px;border:0;background:rgba(251,250,247,.14);color:#FBFAF7;font:300 22px/36px Poppins,Arial,sans-serif;cursor:pointer;padding:0}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var tab = document.createElement('button'); tab.type = 'button'; tab.className = 'lxk-tab'; tab.setAttribute('aria-label', 'Jugar cartas LUXUR');
  tab.innerHTML = VIE ? 'black friday <b>\u2661 30% off</b>' : HOY ? HP + '% off <b>\u2661 solo hoy</b>' : LAST ? '20% off <b>\u2661 se acaba hoy</b>' : FINDE ? '20% off en todo <b>\u2661 este fin de semana</b>' : 'elige tu carta <b>\u2661 hasta 25% off</b>';
  if (FINDE) tab.setAttribute('aria-label', HOY ? HP + '% off solo hoy' : '20% off en todo este fin de semana');
  var ov = document.createElement('div'); ov.className = 'lxk-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  ov.innerHTML = '<div class="lxk-box"><button type="button" class="lxk-x" aria-label="Cerrar">\u00d7</button></div>';
  var box = ov.firstChild, loaded = false;
  if (FINDE){
    box.className = 'lxk-box lxk-promo'; loaded = true;
    if (HOY) box.insertAdjacentHTML('beforeend', '<div class="k">' + (VIE ? 'black friday \u2606 solo hoy' : 'solo hoy \u2606 hasta medianoche') + '</div><div class="n">' + HP + '%</div><div class="t">off en toda la ' + (VIE ? 'tienda' : 'colecci\u00f3n') + (JUE ? '<br>y 25% en \u00faltimas unidades' : '') + '</div><div class="s">sin c\u00f3digo, se pone solo en tu carrito. solo online.</div><a class="b" href="' + SHOP + '">comprar ahora</a>' + (HC ? '<div class="c">\u00bfya eres clienta? tienes <b>' + HC + ' entrando con tu correo o celular de siempre. <a href="/pages/luxur-club">entrar a la b\u00f3veda</a></div>' : ''));
    else box.insertAdjacentHTML('beforeend', '<div class="k">' + (LAST ? '\u00faltimo d\u00eda \u2606 se acaba hoy a medianoche' : 'solo este fin de semana') + '</div><div class="n">20%</div><div class="t">' + (LAST ? 'off, y ma\u00f1ana ya no est\u00e1' : 'off en todo, sin c\u00f3digo') + '</div><div class="s">' + (LAST ? 'sin c\u00f3digo, se pone solo en tu carrito. <span id="lxk-cd"></span>' : 'se pone solo en tu carrito. hasta el domingo a medianoche.') + '</div><a class="b" href="' + SHOP + '">' + (LAST ? 'comprar antes de medianoche' : 'comprar ahora') + '</a><div class="c">\u00bfya eres clienta? tienes <b>25%</b> entrando con tu correo o celular de siempre. <a href="/pages/luxur-club">entrar a la b\u00f3veda</a></div>');
  }
  function bar(){
    var as0 = document.querySelectorAll('a[href*="ops.luxurjeans.com/cartas"]');
    if (!FINDE){ for (var j = 0; j < as0.length; j++){ if (as0[j].closest('.lxk-ov')) continue; if (/20% OFF/.test(as0[j].textContent)) as0[j].textContent = as0[j].textContent.replace('20% OFF', '25% OFF'); } return; }
    var as = as0;
    for (var i = 0; i < as.length; i++){ if (as[i].closest('.lxk-ov')) continue; as[i].href = SHOP; as[i].removeAttribute('target'); as[i].textContent = VIE ? 'BLACK FRIDAY \u2661 30% OFF EN TODA LA TIENDA, SOLO HOY' : HOY ? 'SOLO HOY \u2661 ' + HP + '% OFF SIN C\u00d3DIGO, HASTA MEDIANOCHE' : LAST ? '\u00daLTIMO D\u00cdA \u2661 20% OFF SE ACABA HOY A MEDIANOCHE' : '20% OFF EN TODO ESTE FIN DE SEMANA \u2661 SIN C\u00d3DIGO'; }
  }
  function open(){ if (!loaded){ var f = document.createElement('iframe'); f.src = GAME; f.title = 'Juego de cartas LUXUR'; box.appendChild(f); loaded = true; } ov.classList.add('on'); }
  function close(){ ov.classList.remove('on'); }
  tab.addEventListener('click', open);
  ov.addEventListener('click', function(e){ if (e.target === ov || e.target.className === 'lxk-x') close(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  function mount(){
    document.body.appendChild(tab); document.body.appendChild(ov); bar(); setTimeout(bar, 1500);
    var K = VIE ? 'lxk_seen_v27' : JUE ? 'lxk_seen_j26' : HOY ? 'lxk_seen_l23' : LAST ? 'lxk_seen_last' : FINDE ? 'lxk_seen_finde' : 'lxk_seen';
    if (LAST){ var cd = document.getElementById('lxk-cd'), E = new Date('2026-11-23T04:59:00Z'); var tk = function(){ var d = Math.max(0, E - new Date()), h = Math.floor(d / 36e5), m = Math.floor(d / 6e4) % 60; if (cd) cd.textContent = 'quedan ' + h + ' h ' + (m < 10 ? '0' : '') + m + ' min.'; }; tk(); setInterval(tk, 30000); }
    var seen = false; try { seen = sessionStorage.getItem(K) === '1'; } catch(e){}
    if (!seen){ setTimeout(function(){ open(); try { sessionStorage.setItem(K, '1'); } catch(e){} }, 2500); }
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
