/* LUXUR · juego de cartas: pestaña lateral + popup (se carga desde el tema de Shopify) */
(function(){
  if (window.__lxCartas) return; window.__lxCartas = true;
  var END = new Date('2026-11-27T04:59:00Z');
  if (new Date() > END) return;
  var p = location.pathname;
  if (/\/(cart|checkouts?|account|pages\/luxur-club)/.test(p)) return;
  var GAME = 'https://ops.luxurjeans.com/cartas?embed=1';
  var css = '.lxk-tab{position:fixed;left:0;top:50%;z-index:2147483000;transform:translateY(-50%) rotate(180deg);writing-mode:vertical-rl;background:#1C1C1C;color:#FBFAF7;border:1px solid #E3A7AE;border-right:0;border-radius:14px 0 0 14px;padding:16px 9px;font:600 11px/1 Poppins,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25)}'
    + '.lxk-tab b{color:#E3A7AE;font-weight:600}'
    + '.lxk-ov{position:fixed;inset:0;z-index:2147483001;background:rgba(28,28,28,.72);display:none;align-items:center;justify-content:center;padding:12px}'
    + '.lxk-ov.on{display:flex}'
    + '.lxk-box{position:relative;width:min(440px,100%);height:min(720px,92vh);border-radius:22px;overflow:hidden;background:#1C1C1C;box-shadow:0 30px 80px rgba(0,0,0,.5)}'
    + '.lxk-box iframe{width:100%;height:100%;border:0;display:block}'
    + '.lxk-x{position:absolute;top:10px;right:10px;z-index:2;width:36px;height:36px;border-radius:999px;border:0;background:rgba(251,250,247,.14);color:#FBFAF7;font:300 22px/36px Poppins,Arial,sans-serif;cursor:pointer;padding:0}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var tab = document.createElement('button'); tab.type = 'button'; tab.className = 'lxk-tab'; tab.setAttribute('aria-label', 'Jugar cartas LUXUR');
  tab.innerHTML = 'elige tu carta <b>\u2661 hasta 20% off</b>';
  var ov = document.createElement('div'); ov.className = 'lxk-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  ov.innerHTML = '<div class="lxk-box"><button type="button" class="lxk-x" aria-label="Cerrar">\u00d7</button></div>';
  var box = ov.firstChild, loaded = false;
  function open(){ if (!loaded){ var f = document.createElement('iframe'); f.src = GAME; f.title = 'Juego de cartas LUXUR'; box.appendChild(f); loaded = true; } ov.classList.add('on'); }
  function close(){ ov.classList.remove('on'); }
  tab.addEventListener('click', open);
  ov.addEventListener('click', function(e){ if (e.target === ov || e.target.className === 'lxk-x') close(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  function mount(){
    document.body.appendChild(tab); document.body.appendChild(ov);
    var seen = false; try { seen = sessionStorage.getItem('lxk_seen') === '1'; } catch(e){}
    if (!seen){ setTimeout(function(){ open(); try { sessionStorage.setItem('lxk_seen', '1'); } catch(e){} }, 2500); }
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
