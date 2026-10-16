
(function () {
  var body = document.body;
  var btn = document.getElementById('menu-btn');
  var velo = document.getElementById('velo');
  function cerrarMenu() { body.classList.remove('menu-abierto'); }
  if (btn) btn.addEventListener('click', function () { body.classList.toggle('menu-abierto'); });
  if (velo) velo.addEventListener('click', cerrarMenu);
  document.querySelectorAll('.lateral a').forEach(function (a) { a.addEventListener('click', cerrarMenu); });

  // Sección actual en el menú lateral
  var enlaces = Array.prototype.slice.call(document.querySelectorAll('.lateral ul.secciones a'));
  var cabeceras = enlaces.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  function marcar() {
    var y = window.scrollY + 90, actual = -1;
    cabeceras.forEach(function (h, i) { if (h && h.offsetTop <= y) actual = i; });
    enlaces.forEach(function (a, i) { a.classList.toggle('actual', i === actual); });
  }
  window.addEventListener('scroll', marcar, { passive: true });
  marcar();

  // Buscador: índice de todas las secciones (busqueda.json) + resaltado en la página
  var input = document.getElementById('buscar');
  var caja = document.getElementById('resultados');
  if (!input) return;
  var indice = null, pendiente = null;
  function normal(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function escapar(s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function cargar(cb) {
    if (indice) return cb(indice);
    if (pendiente) return pendiente.push(cb);
    pendiente = [cb];
    fetch('busqueda.json').then(function (r) { return r.json(); }).then(function (d) {
      indice = d.map(function (e) { e.n = normal(e.titulo + ' ' + e.texto); return e; });
      pendiente.forEach(function (f) { f(indice); });
    }).catch(function () { indice = []; pendiente.forEach(function (f) { f(indice); }); });
  }
  function fragmento(texto, palabras) {
    var n = normal(texto), pos = -1;
    for (var i = 0; i < palabras.length && pos < 0; i++) pos = n.indexOf(palabras[i]);
    var ini = Math.max(0, pos - 60), fin = Math.min(texto.length, pos + 110);
    var f = (ini > 0 ? '…' : '') + texto.slice(ini, fin) + (fin < texto.length ? '…' : '');
    var re = new RegExp('(' + palabras.map(function (p) { return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
    return escapar(f).replace(re, '<mark>$1</mark>');
  }
  function quitarMarcas() {
    document.querySelectorAll('.capitulo mark.busq').forEach(function (m) {
      m.replaceWith(document.createTextNode(m.textContent));
    });
    document.querySelectorAll('.capitulo').forEach(function (c) { c.normalize(); });
  }
  function resaltar(palabras) {
    quitarMarcas();
    if (!palabras.length) return 0;
    var re = new RegExp('(' + palabras.map(function (p) { return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'i');
    var walker = document.createTreeWalker(document.querySelector('.contenido'), NodeFilter.SHOW_TEXT, null);
    var nodos = [], n, total = 0;
    while ((n = walker.nextNode())) { if (n.parentNode.closest('script,style,svg,.navpie')) continue; nodos.push(n); }
    nodos.forEach(function (t) {
      var texto = t.nodeValue, nt = normal(texto);
      if (!re.test(nt)) return;
      var frag = document.createDocumentFragment(), resto = texto, nr = nt;
      while (resto.length) {
        var m = re.exec(nr);
        if (!m) { frag.appendChild(document.createTextNode(resto)); break; }
        // normal() no cambia la longitud (solo quita acentos), así que los índices valen para el texto original
        frag.appendChild(document.createTextNode(resto.slice(0, m.index)));
        var mk = document.createElement('mark'); mk.className = 'busq'; mk.textContent = resto.slice(m.index, m.index + m[0].length);
        frag.appendChild(mk); total++;
        resto = resto.slice(m.index + m[0].length); nr = nr.slice(m.index + m[0].length);
        re.lastIndex = 0;
      }
      t.parentNode.replaceChild(frag, t);
    });
    return total;
  }
  var ultimo = '';
  input.addEventListener('input', function () {
    var q = normal(input.value.trim());
    if (q === ultimo) return;
    ultimo = q;
    var palabras = q.split(/\s+/).filter(function (p) { return p.length > 1; });
    if (!palabras.length) { caja.classList.remove('abierto'); caja.innerHTML = ''; quitarMarcas(); return; }
    cargar(function (idx) {
      var hits = idx.filter(function (e) { return palabras.every(function (p) { return e.n.indexOf(p) >= 0; }); }).slice(0, 30);
      var enPagina = resaltar(palabras);
      var h = '';
      if (enPagina) h += '<div class="nada">' + enPagina + ' coincidencia' + (enPagina === 1 ? '' : 's') + ' en esta página (resaltadas).</div>';
      if (!hits.length) h += '<div class="nada">Nada en el Códice con esas palabras.</div>';
      hits.forEach(function (e) {
        h += '<a href="' + e.url + '"><div class="cap">' + escapar(e.capitulo) + '</div><div class="tit">' + escapar(e.titulo) + '</div><div class="frag">' + fragmento(e.texto, palabras) + '</div></a>';
      });
      caja.innerHTML = h;
      caja.classList.add('abierto');
    });
  });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { input.value = ''; ultimo = ''; caja.classList.remove('abierto'); quitarMarcas(); input.blur(); }
    if (ev.key === 'Enter') { var a = caja.querySelector('a'); if (a) location.href = a.getAttribute('href'); }
  });
  document.addEventListener('click', function (ev) { if (!ev.target.closest('.buscar')) caja.classList.remove('abierto'); });
  input.addEventListener('focus', function () { if (caja.innerHTML) caja.classList.add('abierto'); });
})();
