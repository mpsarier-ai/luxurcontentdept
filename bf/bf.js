/* LUXUR · página Black Friday */
(function(){
  var m = document.getElementById('lxbf-mount'); if (!m || window.__lxBF) return; window.__lxBF = true;
  // ventanas de descuento público: [inicio, fin, porcentaje, cierre en palabras]
  var W = [['2026-11-20T05:00:00Z','2026-11-22T05:00:00Z',20,'hasta el domingo a medianoche','black friday luxur ☆ solo online',25],['2026-11-22T05:00:00Z','2026-11-23T04:59:00Z',20,'hasta hoy a medianoche','último día ☆ se acaba hoy a medianoche',25],['2026-11-23T18:20:00Z','2026-11-24T04:59:00Z',15,'hasta hoy a medianoche','solo hoy ☆ se acaba a medianoche',20],['2026-11-26T14:00:00Z','2026-11-27T01:00:00Z',20,'hasta las 8 p. m.','a las 8 p. m. empieza el 30%','30% desde las 6 p. m.'],['2026-11-27T01:00:00Z','2026-11-28T04:59:00Z',30,'hasta el viernes a medianoche','black friday ☆ 30% en toda la tienda',null]];
  var NEXT = new Date('2026-11-27T01:00:00Z');
  var COL = 'black-friday-2026', now = new Date(), win = null;
  for (var i = 0; i < W.length; i++) if (now >= new Date(W[i][0]) && now < new Date(W[i][1])) win = W[i];
  var PCT = win ? win[2] : 0, END = win ? new Date(win[1]) : NEXT;
  var COL25 = (now >= new Date('2026-11-26T14:00:00Z') && now < new Date('2026-11-27T01:00:00Z')) ? 'black-friday-25' : null;
  var VIE = now >= new Date('2026-11-27T01:00:00Z') && now < new Date('2026-11-28T04:59:00Z');
  var EXTRA = COL25 ? [['black-friday-25', 25], ['black-friday-20b', 20]] : VIE ? [['black-friday-25', 30], ['black-friday-20b', 30]] : [];
  function fmt(n){ return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  var hero = win
    ? '<div class="lxb-k">' + win[4] + '</div><div class="lxb-n">' + PCT + '%</div><div class="lxb-t">off en toda la ' + (VIE ? 'tienda' : 'colección') + (COL25 ? '<br><em style="font-style:normal;color:#E3A7AE">y 25% en últimas unidades</em>' : '') + '</div>'
      + '<p class="lxb-s">sin código. se pone solo en tu carrito, ' + win[3] + '.</p>'
    : '<div class="lxb-k">black friday luxur</div><div class="lxb-t" style="margin-top:18px">llega el viernes 27</div>'
      + '<p class="lxb-s">el descuento más alto del año. deja tu jean elegido desde ya.</p>';
  var clock = '<div class="lxb-clock"><div><b data-k="D">00</b><small>días</small></div><div><b data-k="H">00</b><small>horas</small></div><div><b data-k="M">00</b><small>min</small></div><div><b data-k="S">00</b><small>seg</small></div></div>';
  var cli = (win && win[5]) ? '<div class="lxb-cli">¿ya eres clienta? tienes <b>' + (typeof win[5] === 'number' ? win[5] + '%' : win[5]) + '</b> entrando con tu correo o celular de siempre. <a href="/pages/luxur-club">entrar a la bóveda</a></div>' : '';
  var steps = win
    ? '<div class="lxb-rail"><div class="lxb-step"><b>1</b><p>elige tu jean</p><small>el precio que ves ya tiene el ' + PCT + '% off.</small></div>'
      + '<div class="lxb-step"><b>2</b><p>agrégalo al carrito</p><small>el descuento se pone solo, sin código.</small></div>'
      + '<div class="lxb-step"><b>3</b><p>paga antes del cierre</p><small>' + win[3] + '. las tallas no se apartan.</small></div></div>'
    : '';
  m.outerHTML = '<div class="lxb" id="lxb"><section class="lxb-hero">' + hero + clock
    + '<div><a class="lxb-btn" href="#lxb-shop">' + (win ? 'comprar ahora' : 'ver la colección') + '</a></div>' + cli + '</section>' + steps
    + '<div id="lxb-shop"></div><div class="lxb-bar"><div class="lxb-h">' + (win ? (COL25 ? 'todo en descuento hoy' : 'todo esto tiene ' + PCT + '% off') : 'la colección') + '</div>'
    + '<div class="lxb-chips" id="lxbChips"><button type="button" class="on" data-f="all">todo</button>' + (COL25 ? '<button type="button" data-f="p25">25% off</button>' : '') + '<button type="button" data-f="LOW WIDE">low wide</button><button type="button" data-f="EXTRA LOW">extra low straight</button><button type="button" data-f="RELAXED">relaxed</button><button type="button" data-f="WIDE LEG">wide leg</button><button type="button" data-f="otros">más</button></div></div>'
    + '<div class="lxb-grid" id="lxbGrid"><div class="lxb-empty">cargando la colección…</div></div>'
    + '<p class="lxb-foot">' + (win ? 'aplica en la colección black friday, solo en la tienda online, ' + win[3] + '. no se acumula con otros descuentos.' : '') + '</p></div>';
  var root = document.getElementById('lxb');
  function tick(){
    var d = Math.max(0, END - new Date()), v = {D: Math.floor(d / 864e5), H: Math.floor(d / 36e5) % 24, M: Math.floor(d / 6e4) % 60, S: Math.floor(d / 1e3) % 60};
    var bs = root.querySelectorAll('.lxb-clock b'); for (var i = 0; i < bs.length; i++){ var x = v[bs[i].getAttribute('data-k')]; bs[i].textContent = (x < 10 ? '0' : '') + x; }
  }
  tick(); setInterval(tick, 1000);
  root.querySelector('.lxb-btn').addEventListener('click', function(e){ e.preventDefault(); document.getElementById('lxb-shop').scrollIntoView({behavior: 'smooth'}); });
  var FITS = ['LOW WIDE','EXTRA LOW','RELAXED','WIDE LEG'], all = [], f = 'all';
  function fit(t){ t = t.toUpperCase(); for (var i = 0; i < FITS.length; i++) if (t.indexOf(FITS[i]) > -1) return FITS[i]; return 'otros'; }
  function img(src){ return src ? src + (src.indexOf('?') > -1 ? '&' : '?') + 'width=640' : ''; }
  function draw(){
    var g = document.getElementById('lxbGrid'), h = '';
    for (var i = 0; i < all.length; i++){
      var p = all[i]; if (f === 'p25' ? p.pct !== 25 : (f !== 'all' && p.fit !== f)) continue;
      var PP = p.pct || PCT, nowp = p.price * (100 - PP) / 100, was = PP ? p.price : (p.cmp > p.price ? p.cmp : 0);
      h += '<a class="lxb-card' + (p.ok ? '' : ' lxb-out') + '" href="/products/' + encodeURIComponent(p.handle) + '"><div class="lxb-ph">'
        + (p.img ? '<img loading="lazy" src="' + esc(img(p.img)) + '" alt="' + esc(p.title) + '">' : '')
        + (p.ok ? (PP ? '<span class="lxb-tag">' + PP + '% off</span>' : '') : '<span class="lxb-tag">agotado</span>')
        + '</div><div class="lxb-inf"><div class="lxb-name">' + esc(p.title) + '</div><div class="lxb-pr"><b>' + fmt(nowp) + '</b>' + (was ? '<s>' + fmt(was) + '</s>' : '') + '</div></div></a>';
    }
    g.innerHTML = h || '<div class="lxb-empty">no hay piezas en este fit por ahora.</div>';
  }
  document.getElementById('lxbChips').addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return; f = b.getAttribute('data-f');
    var bs = this.querySelectorAll('button'); for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i] === b); draw();
  });
  function load(page, col, pct){
    col = col || COL;
    return fetch('/collections/' + col + '/products.json?limit=250&page=' + page).then(function(r){ return r.json(); }).then(function(j){
      var ps = j.products || [];
      for (var i = 0; i < ps.length; i++){
        var p = ps[i], vs = p.variants || [], ok = false, price = 0, cmp = 0;
        for (var k = 0; k < vs.length; k++){ if (vs[k].available) ok = true; var pr = parseFloat(vs[k].price); if (!price || pr < price){ price = pr; cmp = parseFloat(vs[k].compare_at_price || 0); } }
        if (!price) continue;
        all.push({pct: pct || 0, title: p.title, handle: p.handle, img: p.images && p.images[0] ? p.images[0].src : '', price: price, cmp: cmp, ok: ok, fit: fit(p.title)});
      }
      return ps.length === 250 ? load(page + 1, col, pct) : null;
    });
  }
  EXTRA.reduce(function(pr, e){ return pr.then(function(){ return load(1, e[0], e[1]).catch(function(){}); }); }, Promise.resolve()).then(function(){ return load(1); }).then(function(){ all.sort(function(a, b){ return (b.ok - a.ok) || ((b.pct || 0) - (a.pct || 0)); }); draw(); }).catch(function(){ document.getElementById('lxbGrid').innerHTML = '<div class="lxb-empty"><a href="/collections/' + COL + '">ver la colección</a></div>'; });
})();
