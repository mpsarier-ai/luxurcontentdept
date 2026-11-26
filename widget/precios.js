/* LUXUR · muestra en la web el precio con el descuento automático vigente (el descuento real se aplica solo en el carrito) */
(function(){
  if (window.__lxPrecios) return; window.__lxPrecios = true;
  // ventanas de descuento público: [inicio, fin, porcentaje]
  var W = [['2026-11-20T05:00:00Z','2026-11-23T04:59:00Z',20],['2026-11-23T18:20:00Z','2026-11-24T04:59:00Z',15],['2026-11-26T14:00:00Z','2026-11-27T04:59:00Z',20]];
  var now = new Date(), PCT = 0;
  for (var i = 0; i < W.length; i++) if (now >= new Date(W[i][0]) && now < new Date(W[i][1])) PCT = W[i][2];
  if (!PCT) return;
  var COL = 'black-friday-2026', KEY = 'lxp_handles_v1', set = null;
  var css = 'price-list .lxp-now{color:#C9868E!important;font-weight:600}'
    + 'price-list .lxp-was{text-decoration:line-through;opacity:.6;margin-left:.45em;font-weight:400}'
    + 'price-list .lxp-tag{display:inline-block;margin-left:.5em;padding:2px 8px;border-radius:999px;background:#1C1C1C;color:#FBFAF7;font:600 10px/1.6 Poppins,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;vertical-align:middle;white-space:nowrap}'
    + '.lxp-note{margin-top:6px;font:400 12px/1.4 Poppins,Helvetica,Arial,sans-serif;color:#5A5A5A}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  function fmt(n){ return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function num(t){ var m = (t || '').replace(/[^\d]/g, ''); return m ? parseInt(m, 10) : 0; }
  function handleOf(pl){
    var card = pl.closest('product-card, .product-card, [class*="product-card"]');
    var a = card && card.querySelector('a[href*="/products/"]');
    var href = a ? a.getAttribute('href') : null;
    if (!href){
      if (!card && /\/products\//.test(location.pathname) && pl.closest('.product-info, [class*="product-sticky-bar"], product-sticky-bar')) href = location.pathname;
    }
    if (!href) return null;
    var m = href.split('?')[0].match(/\/products\/([^\/#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function paint(){
    if (!set) return;
    var lists = document.querySelectorAll('price-list');
    for (var i = 0; i < lists.length; i++){
      var pl = lists[i];
      if (pl.closest('cart-drawer, .cart-drawer, .cart, [class*="line-item"], .lxk-ov')) continue;
      var sp = pl.querySelector('sale-price'); if (!sp) continue;
      if (sp.getAttribute('data-lxp') === '1') continue;
      var h = handleOf(pl); if (!h || !set[h]) continue;
      var base = num(sp.lastChild && sp.lastChild.nodeType === 3 ? sp.lastChild.textContent : sp.textContent);
      if (!base) continue;
      var now_ = base * (100 - PCT) / 100;
      var sr = sp.querySelector('.sr-only');
      sp.textContent = ''; if (sr) sp.appendChild(sr);
      sp.appendChild(document.createTextNode(fmt(now_)));
      sp.classList.remove('text-subdued'); sp.classList.add('lxp-now'); sp.setAttribute('data-lxp', '1');
      var old = pl.querySelectorAll('.lxp-was,.lxp-tag'); for (var k = 0; k < old.length; k++) old[k].remove();
      if (!pl.querySelector('compare-at-price')){
        var was = document.createElement('span'); was.className = 'lxp-was'; was.textContent = fmt(base); pl.appendChild(was);
      }
      var tag = document.createElement('span'); tag.className = 'lxp-tag'; tag.textContent = PCT + '% off' + (pl.querySelector('compare-at-price') ? ' extra' : ''); pl.appendChild(tag);
      if (pl.closest('.product-info') && !pl.parentNode.querySelector('.lxp-note')){
        var note = document.createElement('div'); note.className = 'lxp-note'; note.textContent = 'solo hoy: el ' + PCT + '% off se pone solo en tu carrito, sin código. solo online, hasta medianoche.';
        pl.parentNode.insertBefore(note, pl.nextSibling);
      }
    }
  }
  var t = null;
  function later(){ if (t) return; t = setTimeout(function(){ t = null; paint(); }, 120); }
  function start(){
    paint();
    new MutationObserver(later).observe(document.documentElement, {childList: true, subtree: true, characterData: true});
  }
  function load(page, acc){
    return fetch('/collections/' + COL + '/products.json?limit=250&page=' + page).then(function(r){ return r.json(); }).then(function(j){
      var ps = j.products || []; for (var i = 0; i < ps.length; i++) acc[ps[i].handle] = 1;
      return ps.length === 250 ? load(page + 1, acc) : acc;
    });
  }
  try { var c = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (c && c.t > Date.now() - 6e5) set = c.s; } catch(e){}
  function go(){ if (document.body) start(); else document.addEventListener('DOMContentLoaded', start); }
  if (set) go();
  else load(1, {}).then(function(s){ set = s; try { sessionStorage.setItem(KEY, JSON.stringify({t: Date.now(), s: s})); } catch(e){} go(); }).catch(function(){});
})();
