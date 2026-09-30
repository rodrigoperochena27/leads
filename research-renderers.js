var FORM_HUMANO = {'91':'Liability (BI&PD)','91X':'Liability (BI&PD)','34':'Cargo','84':'Surety Bond','85':'Trust Fund'};
function tipoHumano(code){
  var c = String(code || '').toUpperCase();
  return FORM_HUMANO[c] || (c ? 'Form ' + c : '');
}
function metodoHumano(m){
  var s = String(m || '').toUpperCase();
  if (s.indexOf('REPL') !== -1) return ['Replaced','rep'];
  if (s.indexOf('CANC') !== -1 || s === 'CANCEL') return ['Cancelled','can'];
  return [m || '', 'rep'];
}
function fFecha(mdY){ // 'MM/DD/YYYY' -> 'Mar 1, 2019' (o el crudo si no parsea)
  var m = String(mdY || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return String(mdY || '');
  var MES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return MES[parseInt(m[1],10)-1] + ' ' + parseInt(m[2],10) + ', ' + m[3];
}
function tsDe(mdY){
  var m = String(mdY || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? new Date(parseInt(m[3],10), parseInt(m[1],10)-1, parseInt(m[2],10)).getTime() : 0;
}
// Renovación proyectada: próximo aniversario de la fecha efectiva.
function renovacion(effTs){
  if (!effTs) return null;
  var eff = new Date(effTs), hoy = new Date();
  var r = new Date(hoy.getFullYear(), eff.getMonth(), eff.getDate());
  if (r.getTime() <= hoy.getTime()) r = new Date(hoy.getFullYear()+1, eff.getMonth(), eff.getDate());
  var dias = Math.ceil((r.getTime() - hoy.getTime()) / 864e5);
  var MES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return {fecha: MES[r.getMonth()] + ' ' + r.getDate() + ', ' + r.getFullYear(), dias: dias};
}
// Estado visual del chip: parte del c.s del motor y aplica la regla
// cliente de renovación <= 90 días (ambar) sobre los 'ok'.
function estadoChip(ins){
  if (!ins) return null;
  var s = ins.s, ren = null;
  if (s === 'ok' && ins.e) {
    ren = renovacion(ins.e);
    if (ren && ren.dias <= 90) s = 'amber';
  }
  return {s: s, n: ins.n || '', ren: ren};
}
function claseDot(s){
  return s === 'red' ? 'id-red' : (s === 'amber' ? 'id-amber' : (s === 'ok' ? 'id-ok' : 'id-gray'));
}
// Chip de la LISTA: una sola línea discreta. Sin DOT: cadena vacía
// (cero cambios de layout).
function chipSeguroLista(l){
  if (!l.dot) return '';
  // v6.1: superficie minima — texto fijo, el color cuenta la historia
  // y el detalle vive en el sheet. La tarjeta no crece de ancho ni
  // carga nombres largos de aseguradoras.
  var e = estadoChip(l.ins);
  return '<span class="inschip"><span class="idot ' + claseDot(e ? e.s : 'gray') +
    '"></span><span class="itxt">FMCSA filing</span></span>';
}

// ── Sheet / modal ──
var seguroAbierto = null;
function cerrarSeguro(){
  if (!seguroAbierto) return;
  var el = seguroAbierto; seguroAbierto = null;
  el.ov.classList.remove('on'); el.sh.classList.remove('on');
  setTimeout(function(){ if (el.ov.parentNode) el.ov.parentNode.removeChild(el.ov);
    if (el.sh.parentNode) el.sh.parentNode.removeChild(el.sh); }, 240);
}
// v6.2: el sheet se arma completo (hero + tabs + cuerpo) segun la
// data disponible. Con carrier verificado: hero oscuro con nombre
// legal, badges DOT/MC, stat boxes y tabs Insurance | Carrier. Sin
// carrier (JSON viejo, red caida o DOT inexistente): encabezado
// simple v6.1 y solo el cuerpo de Insurance — cero dead-ends.
function armarSeguroSheet(sh, dot, ins){
  var carrier = ins && ins.carrier;
  var conHero = !!(carrier && carrier.exists && carrier.name);
  var conTabCarrier = !!(carrier && carrier.exists !== false);
  var H = '';
  if (conHero) {
    var prof = carrier.prof || null;
    var m150 = carrier.m150 || null;
    var lugar = [carrier.city, carrier.state].filter(Boolean).join(', ');
    var dotOk = prof && prof.allowed === 'Y';
    H += '<div class="shero">' +
      '<button type="button" class="sclose" aria-label="Close">&#10005;</button>' +
      '<div class="shname">' + esc(carrier.name) + '</div>' +
      (lugar ? '<div class="shloc">' + esc(lugar) + '</div>' : '') +
      '<div class="shpills">' +
        '<span class="pchip ' + (prof ? (dotOk ? 'ok' : 'red') : 'slate') + '">DOT ' + esc(dot) + '</span>' +
        (m150 && m150.mc ? '<span class="pchip slate">' + esc(m150.mc) + '</span>' : '') +
        (prof && prof.op ? '<span class="pchip slate">' + esc(prof.op) + '</span>' : '') +
      '</div>' +
      (prof ? '<div class="shstats">' +
        '<div class="shs"><b>' + (prof.pu === null ? '-' : prof.pu) + '</b><span>Power Units</span></div>' +
        '<div class="shs"><b>' + (prof.drv === null ? '-' : prof.drv) + '</b><span>Drivers</span></div>' +
      '</div>' : '') +
    '</div>';
  } else {
    H += '<div class="shead"><div><div class="sttl">Insurance</div>' +
      '<div class="ssub">DOT ' + esc(dot) + '</div></div>' +
      '<button type="button" class="sclose" aria-label="Close">&#10005;</button></div>';
  }
  if (ins && conTabCarrier) {
    H += '<div class="stabs">' +
      '<button type="button" class="stab on" data-tab="ins">Insurance</button>' +
      '<button type="button" class="stab" data-tab="car">Carrier</button>' +
      '<button type="button" class="stab" data-tab="insp">Inspections</button>' +
      '<button type="button" class="stab" data-tab="tl">Timeline</button></div>';
  }
  H += '<div class="sbody">' + (ins ? cuerpoSeguro(ins) : '<div class="spin" style="margin:40px auto"></div>') + '</div>';
  sh.innerHTML = H;
  sh.querySelector('.sclose').addEventListener('click', cerrarSeguro);
  var tabs = sh.querySelectorAll('.stab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function(){
      var yo = this;
      for (var k = 0; k < tabs.length; k++) tabs[k].classList.remove('on');
      yo.classList.add('on');
      var body = sh.querySelector('.sbody');
      var cual = yo.getAttribute('data-tab');
      body.innerHTML = (cual === 'car') ? cuerpoCarrier(ins)
                     : (cual === 'insp') ? cuerpoInspecciones(ins)
                     : (cual === 'tl') ? cuerpoTimeline(ins) : cuerpoSeguro(ins); // v6.14
      body.scrollTop = 0;
    });
  }
}

// Reintento on-demand (chip gris): api=insurance con throttle del motor.

// Historial: dedup exacto + sin duración cuando el feed federal trae
// fechas incoherentes (cancelled < effective — ocurre en carriers
// grandes con cadenas de reemplazo).
function historialLimpio(hist){
  var visto = {}, out = [];
  (hist || []).forEach(function(h){
    var k = [h.insurer, h.type, h.effective, h.cancelled, h.method].join('|');
    if (visto[k]) return; visto[k] = 1; out.push(h);
  });
  return out;
}
function cuerpoSeguro(ins){
  var H = '';
  var act = ins.active;
  var e = estadoChip(ins.c ? ins.c : null);

  // 0) v6.18 (Fase 4D): talking points pre-llamada (bloque tp del
  // motor v24.11, ya validado y recortado en servidor). tp ausente
  // => nada: la sintesis no es data (el detalle completo sigue en
  // las tabs), asi que su ausencia no se anuncia — a diferencia de
  // basics/rel. Escapado igual por higiene (XSS).
  if (ins.tp && ins.tp.txt) {
    var tpb = String(ins.tp.txt).split('\n')
      .map(function (x) { return x.trim(); })
      .filter(Boolean).slice(0, 5);
    if (tpb.length) {
      H += '<div class="icard">' + labelIco('gauge', 'Before you call') +
        '<ul class="tpul">' + tpb.map(function (b) {
          return '<li>' + esc(b) + '</li>';
        }).join('') + '</ul>' +
        '<p class="ocap" style="margin:8px 0 0">AI summary of this carrier\u2019s ' +
        'federal records \u2014 verify each point in the tabs below before quoting.</p></div>';
    }
  }

  // 1) Estado actual
  if (act) {
    var ren = renovacion(tsDe(act.effective));
    H += '<div class="icard"><p class="label">Current coverage</p>';
    if (act.pending_cancel) {
      H += '<div class="iband red">Pending cancellation \u2014 effective ' + esc(fFecha(act.cancel_effective)) +
        '. Coverage lapses on that date unless replaced.</div>';
    } else if (ren && ren.dias <= 90) {
      H += '<div class="iband amber">Projected renewal in ' + ren.dias + ' days.</div>';
    }
    H += '<p class="iins">' + esc(act.insurer || '-') + '</p>' +
      '<p class="itype">' + esc(tipoHumano(act.form)) + (act.policy_no ? ' \u00b7 Policy ' + esc(act.policy_no) : '') + '</p>' +
      '<div class="drow"><span>Effective since</span><b>' + esc(fFecha(act.effective)) + '</b></div>' +
      (ren ? '<div class="drow"><span>Projected renewal</span><b>' + esc(ren.fecha) + ' (' + ren.dias + 'd)</b></div>' : '') +
      '</div>';
    var extras = (ins.active_all || []).slice(1);
    if (extras.length) {
      H += '<div class="icard"><p class="label">Other active filings</p>' +
        extras.map(function(a){
          return '<div class="drow"><span>' + esc(tipoHumano(a.form)) + '</span><b>' + esc(a.insurer) + '</b></div>';
        }).join('') + '</div>';
    }
  } else if (ins.carrier && ins.carrier.exists === false) {
    // v6.1: el DOT no existe en FMCSA — casi siempre un numero mal
    // dictado. Mensaje accionable, no una falsa "sin seguro".
    H += '<div class="icard"><p class="label">Current coverage</p>' +
      '<div class="iband red">DOT not found in FMCSA records.</div>' +
      '<p class="itype" style="margin:0">The number may have been taken down wrong \u2014 ' +
      'confirm it with the client and update the lead notes.</p></div>';
  } else if (ins.no_filing) {
    H += '<div class="icard"><p class="label">Current coverage</p>' +
      '<div class="iband amber">No FMCSA filing on record for this DOT.</div>' +
      '<p class="itype" style="margin:0">' +
      (ins.carrier && ins.carrier.exists && ins.carrier.name
        ? 'FMCSA lists this DOT as ' + esc(ins.carrier.name) +
          (ins.carrier.city ? ' (' + esc(ins.carrier.city) + (ins.carrier.state ? ', ' + esc(ins.carrier.state) : '') + ')' : '') +
          ' with no federal insurance filings. '
        : '') +
      'Intrastate carriers and new authorities may not have federal ' +
      'insurance filings \u2014 this is a federal-record status, not proof the business is uninsured.</p></div>';
  } else {
    H += '<div class="icard"><p class="label">Current coverage</p>' +
      '<div class="iband amber">No active insurance on file. All previous policies were cancelled or replaced.</div></div>';
  }

  // 2) Métricas derivadas
  var hist = historialLimpio(ins.history);
  var aseguradoras = {};
  hist.forEach(function(h){ if (h.insurer) aseguradoras[h.insurer] = 1; });
  if (act && act.insurer) aseguradoras[act.insurer] = 1;
  var nIns = Object.keys(aseguradoras).length;
  var tenencia = '-';
  if (act) {
    var ts = tsDe(act.effective);
    if (ts) {
      var meses = Math.max(0, Math.floor((Date.now() - ts) / (30.44 * 864e5)));
      tenencia = meses >= 12 ? (Math.floor(meses / 12) + 'y ' + (meses % 12) + 'm') : (meses + 'm');
    }
  }
  H += '<div class="imetrics">' +
    '<div class="im"><b>' + esc(tenencia) + '</b><span>With insurer</span></div>' +
    '<div class="im"><b>' + nIns + '</b><span>Insurers on record</span></div>' +
    '<div class="im"><b>' + hist.length + '</b><span>Past filings</span></div>' +
    '</div>';

  // 3) Historial
  if (hist.length) {
    H += '<div class="icard"><p class="label">Policy history</p>' +
      hist.map(function(h){
        var mm = metodoHumano(h.method);
        var e1 = tsDe(h.effective), e2 = tsDe(h.cancelled);
        var periodo = fFecha(h.effective) + ' \u2013 ' + fFecha(h.cancelled);
        var dur = '';
        if (e1 && e2 && e2 >= e1) {
          var dd = Math.round((e2 - e1) / 864e5);
          dur = dd >= 365 ? ' \u00b7 ' + (dd / 365).toFixed(1).replace('.0','') + 'y'
              : dd >= 30 ? ' \u00b7 ' + Math.round(dd / 30) + 'mo' : ' \u00b7 ' + dd + 'd';
        }
        return '<div class="ih"><div class="ihi">' + esc(h.insurer || '-') +
          '<span class="iht ' + mm[1] + '">' + esc(mm[0]) + '</span></div>' +
          '<div class="ihd">' + esc(tipoHumano(h.type)) + ' \u00b7 ' + esc(periodo) + esc(dur) + '</div></div>';
      }).join('') + '</div>';
  }

  // 4) Pie
  H += '<p class="ifoot">FMCSA L&amp;I data \u00b7 Updated ' + esc(ins.updated_at || '') +
    (hist.length >= 20 ? ' \u00b7 Last 20 filings shown' : '') + '<br>' +
    '<a href="https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=' +
    encodeURIComponent(ins.dot || '') + '" target="_blank" rel="noopener">View SAFER snapshot</a></p>';
  return H;
}
// ── v6.2: TAB CARRIER (perfil QCMobile + Census) ──
function fmtPct(n){
  if (n === null || n === undefined) return '-';
  return (Math.round(n * 10) / 10) + '%';
}
function fmtMillas(s){
  var n = Number(s);
  return isNaN(n) ? String(s || '-') : n.toLocaleString('en-US');
}
function fechaIso(iso){ // 'YYYY-MM-DD' -> 'May 20, 2026'
  var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(iso || '-');
  var MES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return MES[parseInt(m[2],10)-1] + ' ' + parseInt(m[3],10) + ', ' + m[1];
}
function authHumano(v){
  if (v === 'A') return ['Active', 'ok'];
  if (v === 'I') return ['Inactive', ''];
  if (v === 'N') return ['None', ''];
  return ['-', ''];
}
// Barra OOS contra el promedio nacional. Verde bajo el promedio,
// rojo encima; marcador gris = promedio nacional. Sin inspecciones:
// badge N/A y texto honesto (no se inventa un 0% "bueno").
function barraOos(titulo, o){
  if (!o) return '';
  if (!o.i) {
    return '<div class="oosb"><div class="ot"><span>' + esc(titulo) +
      '</span><span class="obadge na">N/A</span></div>' +
      '<p class="ocap" style="margin:6px 0 0">No inspections in the last 24 months.</p></div>';
  }
  var r = o.r === null ? 0 : o.r;
  var encima = (o.na !== null && o.r !== null && o.r > o.na);
  var cl = encima ? 'bad' : 'ok';
  var marca = (o.na !== null) ? '<span class="omark" style="left:' + Math.min(o.na, 100) + '%"></span>' : '';
  return '<div class="oosb">' +
    '<div class="ot"><span>' + esc(titulo) + '</span>' +
      '<span class="obadge ' + cl + '">' + esc(fmtPct(o.r)) + '</span></div>' +
    '<div class="otrack"><span class="ofill ' + cl + '" style="width:' + Math.min(r, 100) + '%"></span>' + marca + '</div>' +
    '<p class="ocap" style="margin:0">' + o.o + ' of ' + o.i + ' inspections OOS' +
      (o.na !== null ? ' \u00b7 National Avg: ' + esc(fmtPct(o.na)) : '') +
      (o.na !== null && o.r !== null
        ? ' \u00b7 <span class="' + (encima ? 'above' : 'below') + '">' + (encima ? 'above average' : 'below average') + '</span>'
        : '') + '</p></div>';
}
// v6.10: iconos SVG inline (stroke, heredan color). NO emojis.
var ICONOS = {
  truck: '<path d="M1 4h9v7H1zM10 6h3l2 2.5V11h-5zM4 12.6a1.4 1.4 0 1 0 0-.01M12 12.6a1.4 1.4 0 1 0 0-.01"/>',
  trailer: '<path d="M1 4h11v6H1zM12 10h3M4 12.3a1.3 1.3 0 1 0 0-.01M8 12.3a1.3 1.3 0 1 0 0-.01"/>',
  doc: '<path d="M4 1h6l3 3v11H4zM10 1v3h3M6 7h5M6 10h5"/>',
  shield: '<path d="M8 1l6 2v5c0 4-2.7 6.2-6 7-3.3-.8-6-3-6-7V3z"/>',
  wrench: '<path d="M9.5 3.5a3.4 3.4 0 0 0-4.6 4L2 10.4 4.6 13l2.9-2.9a3.4 3.4 0 0 0 4-4.6L9.4 7.6 7.4 5.6z"/>',
  phone: '<path d="M3 2h3l1.5 3.5L6 7a9 9 0 0 0 4 4l1.5-1.5L15 11v3c0 .6-.5 1-1 1A12 12 0 0 1 2 3c0-.5.4-1 1-1z"/>',
  pin: '<path d="M8 15s-5-5.2-5-8.5a5 5 0 0 1 10 0C13 9.8 8 15 8 15zM8 8.2a1.7 1.7 0 1 0 0-.01"/>',
  cal: '<path d="M2 3h12v11H2zM2 6.5h12M5 1v3M11 1v3"/>',
  box: '<path d="M2 5l6-3 6 3v7l-6 3-6-3zM2 5l6 3 6-3M8 8v7"/>',
  gauge: '<path d="M2 13a7 7 0 1 1 12 0M8 10l3-4M8 10.5a1 1 0 1 0 0-.01"/>'
};
function ico(n){
  return '<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONOS[n] || '') + '</svg>';
}
function labelIco(n, txt){ return '<p class="label">' + ico(n) + txt + '</p>'; }
// v6.10: violaciones registradas de UN vehiculo (cruce local, cero red):
// por inspeccion, ubica la unidad con ese VIN y filtra sus violaciones.
function violacionesDeVin(ins, vin){
  var out = [];
  if (!ins || !ins.insp || !ins.insp.list) return out;
  ins.insp.list.forEach(function(x){
    var unidad = null;
    (x.u || []).forEach(function(u){ if (u.vin === vin) unidad = u; });
    if (!unidad) return;
    (x.v || []).forEach(function(v){
      if (String(v.u) === String(unidad.n)) out.push({d: x.d, c: v.c, txt: v.d, o: v.o});
    });
  });
  return out;
}
// v6.10: acordeon del detalle por vehiculo (el HTML del tab se
// reconstruye en cada cambio, asi que el handler es global por indice)
function toggleFlota(i){
  var det = document.getElementById('fdet-' + i);
  var fila = document.getElementById('fitem-' + i);
  if (!det || !fila) return;
  det.classList.toggle('on');
  fila.classList.toggle('open');
}
// v6.9: etiquetas estandar del formulario MCS-150 para flags crgo_*
// (lo no reconocido se muestra con el sufijo crudo: nada se pierde)
var CARGO_LBL = {genfreight:'General Freight', household:'Household Goods',
  metalsheet:'Metal: Sheets, Coils, Rolls', motorveh:'Motor Vehicles',
  drivetow:'Drive Away / Tow Away', logpole:'Logs, Poles, Beams, Lumber',
  bldgmat:'Building Materials', mobilehome:'Mobile Homes',
  machlrg:'Machinery, Large Objects', produce:'Fresh Produce',
  liqgas:'Liquids / Gases', intermodal:'Intermodal Containers',
  passengers:'Passengers', oilfield:'Oilfield Equipment', livestock:'Livestock',
  grainfeed:'Grain, Feed, Hay', coalcoke:'Coal / Coke', meat:'Meat',
  garbage:'Garbage / Refuse', usmail:'US Mail', chem:'Chemicals',
  drybulk:'Commodities Dry Bulk', coldfood:'Refrigerated Food',
  beverages:'Beverages', paperprod:'Paper Products', utility:'Utilities',
  farmsupp:'Agricultural / Farm Supplies', construct:'Construction',
  waterwell:'Water Well', cargoothr:'Other'};
function etiquetaCargo(c){ return CARGO_LBL[String(c)] || String(c).toUpperCase(); }
// v6.12: vPIC llama "INCOMPLETE VEHICLE" al chasis-cabina (M2, etc.);
// para Jenny suena a dato roto. Solo se traduce ESA cadena exacta.
function tipoVehiculo(t){
  return String(t || '').toUpperCase() === 'INCOMPLETE VEHICLE' ? 'TRUCK (CHASSIS)' : (t || '');
}
// v6.9: '3232891777' -> '(323) 289-1777'; otros formatos se muestran tal cual
function fmtTel(t){
  var d = String(t || '').replace(/\D/g, '');
  if (d.length === 10) return '(' + d.slice(0,3) + ') ' + d.slice(3,6) + '-' + d.slice(6);
  return String(t || '');
}
// v6.9: "CLE ELUM WA" + st "WA" => sin duplicar el estado
function lugarInsp(loc, st){
  loc = String(loc || ''); st = String(st || '');
  if (!loc) return esc(st);
  if (!st || loc.toUpperCase().indexOf(st.toUpperCase()) > -1) return esc(loc);
  return esc(loc + ', ' + st);
}
// v6.9: indice vin -> item de flota (para ano/tipo en la tabla de equipo)
function mapaFlota(ins){
  var m = {};
  if (ins && ins.fleet && ins.fleet.list) ins.fleet.list.forEach(function(f){ m[f.vin] = f; });
  return m;
}
// v6.9: "2015 GREAT DANE TRAILERS Great Dane Trailers" => sin modelo redundante
function lineaVehiculo(f){
  var mk = String(f.mk || ''), md = String(f.md || '');
  if (md && mk.toUpperCase().indexOf(md.toUpperCase()) > -1) md = '';
  return [f.y, mk, md].filter(Boolean).join(' ');
}
// v6.8 (Fase 3): niveles CVSA estandar (universales, no mapeo propio)
var NIVELES_INSP = {1:'Full', 2:'Walk-Around', 3:'Driver-Only', 4:'Special',
                    5:'Vehicle-Only', 6:'Radioactive'};
function nivelInsp(l){
  return l ? ('Level ' + l + (NIVELES_INSP[l] ? ' \u00b7 ' + NIVELES_INSP[l] : '')) : '';
}
// v6.8: nombre de la unidad de una violacion ("Driver" / "Unit 1 \u00b7 PETERBILT")
function unidadViol(u, unidades){
  if (String(u).toUpperCase() === 'D') return 'Driver';
  if (!u) return '';
  var mk = '';
  (unidades || []).forEach(function(x){ if (String(x.n) === String(u)) mk = x.mk || ''; });
  return 'Vehicle \u00b7 Unit ' + esc(String(u)) + (mk ? ' (' + esc(mk) + ')' : '');
}
// v6.8 (Fase 3): tab Inspections — historial de 36 meses con
// violaciones textuales oficiales. Tolerancia total: JSON pre-Fase 3
// (sin .insp) => "not loaded yet" (el refresco semanal lo trae);
// insp.deg => aviso honesto de detalle incompleto; n:0 => "sin
// inspecciones" (que NO es lo mismo que red caida).
function cuerpoInspecciones(ins){
  var ip = ins && ins.insp;
  if (!ip) {
    return '<p class="empty">Inspection history not loaded yet.<br>' +
      'It refreshes automatically \u2014 reopen in a few minutes.</p>';
  }
  var H = '';
  if (!ip.n) {
    H += '<p class="empty">No roadside inspections on record in the last ' +
      (ip.win_m || 36) + ' months.</p>' +
      '<p class="ocap" style="margin:0;text-align:center">Common for new or small carriers \u2014 fewer miles, fewer stops.</p>';
    return H;
  }
  // v6.9: resumen arriba (estilo dotsearch) con la data visible
  var totV = 0, totO = 0;
  ip.list.forEach(function(x){ totV += (x.t || 0); totO += (x.o || 0); });
  H += '<div class="icard">' + labelIco('doc', 'Summary \u00b7 last ' + (ip.win_m || 36) + ' months') +
    '<div class="cstats" style="grid-template-columns:repeat(3,1fr)">' +
      '<div class="cs"><b>' + ip.n + '</b><span>Inspections</span></div>' +
      '<div class="cs"><b>' + totV + '</b><span>Violations</span></div>' +
      '<div class="cs"><b>' + totO + '</b><span>OOS</span></div>' +
    '</div>' +
    (ip.list.length < ip.n ? '<p class="ocap" style="margin:8px 0 0">Showing latest ' +
      ip.list.length + ' of ' + ip.n + '.</p>' : '') +
    (function(){ // v6.10: breakdown por nivel + estados (computado local)
      var porNivel = {}, estados = {};
      ip.list.forEach(function(x){
        if (x.lvl) porNivel[x.lvl] = (porNivel[x.lvl] || 0) + 1;
        if (x.st) estados[x.st] = 1;
      });
      var nivs = Object.keys(porNivel).sort().map(function(l){
        return nivelInsp(Number(l)) + ' \u00d7 ' + porNivel[l];
      });
      var sts = Object.keys(estados).sort();
      var s = '';
      if (nivs.length) s += '<div class="drow"><span>By level</span><b style="text-align:right">' + esc(nivs.join(' \u00b7 ')) + '</b></div>';
      if (sts.length) s += '<div class="drow" style="border-bottom:0"><span>Inspected in</span><b>' + esc(sts.join(', ')) + '</b></div>';
      return s;
    })() + '</div>';
  // v6.14 (Fase 4A): desglose por BASIC del snapshot SMS mensual
  // (bloque basics del motor v24.9). Ventana ~24m: NO es la de los
  // 36m de arriba, y la leyenda lo declara con el rango real del
  // carrier + el asof del snapshot. Sin chips de filtro (join
  // unique_id != inspection_id muerto, sonda 14-ago). Sin basics en
  // el JSON (pre-v24.9 o red caida) => "not loaded yet", regla 6.
  var bb = ins.basics;
  if (bb) {
    H += '<div class="icard">' + labelIco('shield', 'Violation breakdown \u00b7 BASIC categories');
    if (bb.cats && bb.cats.length) {
      H += '<table class="btbl"><tr><th>Category</th><th>Viol.</th><th>Severity</th><th>OOS</th></tr>';
      bb.cats.forEach(function(c){
        H += '<tr><td>' + esc(c.n) + '</td><td>' + (c.tot || 0) + '</td><td>' + (c.sev || 0) +
          '</td><td' + (c.oos > 0 ? ' class="boos"' : '') + '>' + (c.oos || 0) + '</td></tr>';
      });
      H += '</table>';
    } else {
      H += '<p class="ocap" style="margin:2px 0 0">No violations in the current SMS snapshot.</p>';
    }
    H += '<p class="ocap" style="margin:8px 0 0">FMCSA SMS snapshot' +
      (bb.asof ? ' as of ' + esc(fechaIso(bb.asof)) : '') +
      (bb.from && bb.to ? ' \u00b7 covers ' + esc(fechaIso(bb.from)) + ' \u2013 ' + esc(fechaIso(bb.to)) : '') +
      ' \u2014 a \u224824-month window, not the ' + (ip.win_m || 36) + '-month list below. ' +
      'Severity per FMCSA SMS weights; percentile scores are not public.</p></div>';
  } else {
    H += '<p class="ocap" style="margin:0 0 10px;text-align:center">BASIC violation breakdown not loaded yet \u2014 it refreshes automatically.</p>';
  }
  var flota = mapaFlota(ins);
  if (ip.deg) {
    H += '<div class="iband amber">Some inspection details could not be loaded \u2014 they refresh automatically.</div>';
  }
  ip.list.forEach(function(x){
    var limpio = (x.t === 0);
    H += '<div class="icard">' +
      '<div class="inh">' +
        '<div><b>' + esc(fechaIso(x.d) || x.d || '-') + '</b>' +
          '<span class="inloc">' + ico('pin') + lugarInsp(x.loc, x.st) + '</span></div>' +
        '<div class="inbdg">' +
          (limpio ? '<span class="obadge ok">Clean</span>'
                  : '<span class="obadge ' + (x.o > 0 ? 'bad' : 'amb') + '">' +
                      x.t + ' violation' + (x.t === 1 ? '' : 's') + '</span>') +
          (x.o > 0 ? '<span class="obadge bad">OOS</span>' : '') +
        '</div></div>' +
      '<p class="ocap" style="margin:2px 0 0">' +
        [nivelInsp(x.lvl), (x.rep ? 'Report ' + esc(x.rep) : ''),
         (x.t > 0 ? [(x.dv ? x.dv + ' Driver' : ''), (x.vv ? x.vv + ' Vehicle' : ''),
                     (x.hv ? x.hv + ' Hazmat' : '')].filter(Boolean).join(' / ') : '')
        ].filter(Boolean).join(' \u00b7 ') + '</p>';
    // v6.9: equipo inspeccionado (ano/tipo via flota decodificada, VIN clicable, placa)
    if (x.u && x.u.length) {
      H += '<div class="vlist">';
      x.u.forEach(function(u){
        var f = (u.vin && flota[u.vin]) || {};
        var linea = lineaVehiculo({y: f.y, mk: f.mk || u.mk, md: f.md}); // v6.12: vPIC primero
        var esTrailer2 = /trailer/i.test(f.t || '');
        H += '<div class="eqrow"><div><b>' + ico(esTrailer2 ? 'trailer' : 'truck') + esc(linea || u.mk || '-') + '</b>' +
          '<span class="eqmeta">' + [
            (f.t ? esc(tipoVehiculo(f.t)) : ''),
            (u.lic ? esc((u.lst ? u.lst + ' ' : '') + u.lic) : '')
          ].filter(Boolean).join(' \u00b7 ') + '</span></div>' +
          (u.vin ? '<span class="fvin" style="color:#667085">' + esc(u.vin) + '</span>' : '') + '</div>';
      });
      H += '</div>';
    }
    if (x.v && x.v.length) {
      H += '<div class="vlist">';
      x.v.forEach(function(v){
        H += '<div class="vitem' + (v.o ? ' voos' : '') + '">' +
          '<div class="inh"><div class="vd">' + esc(v.d || v.c || '') + '</div>' +
            '<span class="vchip ' + (v.o ? 'oos' : 'warn') + '">' + (v.o ? 'OOS' : 'Warning') + '</span></div>' +
          '<div class="vm">' + esc(v.c || '') +
            (unidadViol(v.u, x.u) ? ' \u00b7 ' + unidadViol(v.u, x.u) : '') + '</div>' +
        '</div>';
      });
      H += '</div>';
    } else if (!limpio && ip.deg) {
      H += '<p class="ocap" style="margin:6px 0 0">Violation details pending.</p>';
    }
    H += '</div>';
  });
  H += '<p class="ifoot">FMCSA roadside inspection data (updated daily) \u00b7 Updated ' +
    esc(ins.updated_at || '') + '</p>';
  return H;
}
// v6.14 (Fase 4C): Company Timeline — cronologia del carrier con
// data que YA vive en el INSURANCE_JSON. Cero red, cero motor.
// Gaps de cobertura por FUSION DE INTERVALOS (historial L&I +
// polizas activas): un reemplazo con solape o continuidad al dia
// siguiente NO es gap. Gaps cerrados se muestran desde 7 dias (los
// tramites de 1-2 dias son ruido y la leyenda lo declara); el gap
// ABIERTO hasta hoy se muestra siempre — es el argumento de venta
// numero uno. El nodo "Today" no pinta rojo a un intrastate sin
// filing (no_filing != sin seguro real).
function cuerpoTimeline(ins){
  if (!ins) return '<p class="empty">Timeline not loaded yet.</p>';
  var DIA = 864e5, hoy = Date.now();
  var MESN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fTs(ts){ var d = new Date(ts); return MESN[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
  function tsIso(iso){
    var x = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return x ? new Date(+x[1], +x[2]-1, +x[3]).getTime() : 0;
  }
  function durTxt(dd){
    return dd >= 365 ? ((dd/365).toFixed(1).replace('.0','') + 'y')
         : dd >= 30 ? (Math.round(dd/30) + 'mo') : (dd + 'd');
  }
  var m = (ins.carrier && ins.carrier.m150) || null;
  var ev = [];
  // 1) Registro federal (Census)
  if (m && m.add && tsIso(m.add)) ev.push({ts: tsIso(m.add), cls: '',
    t: 'DOT registered with FMCSA', m: fechaIso(m.add)});
  if (m && m.date && tsIso(m.date)) ev.push({ts: tsIso(m.date), cls: '',
    t: 'Latest MCS-150 filing', m: fechaIso(m.date) +
      (m.mi ? ' \u00b7 ' + esc(fmtMillas(m.mi)) + ' mi reported' + (m.yr ? ' (' + esc(String(m.yr)) + ')' : '') : '')});
  // 2) Polizas: historial (cerradas) + activas (abiertas hasta hoy)
  var hist = historialLimpio(ins.history);
  var iv = [];
  hist.forEach(function(h){
    var a = tsDe(h.effective); if (!a) return;
    var b = tsDe(h.cancelled) || a;
    if (b < a) b = a;
    iv.push([a, b]);
    var mm = metodoHumano(h.method);
    ev.push({ts: a, cls: '',
      t: esc(h.insurer || '-') + (mm[0] ? ' <span class="iht ' + mm[1] + '">' + esc(mm[0]) + '</span>' : ''),
      m: [esc(tipoHumano(h.type)), esc(fFecha(h.effective)) + ' \u2013 ' + esc(fFecha(h.cancelled)) +
          (b > a ? ' \u00b7 ' + durTxt(Math.round((b - a) / DIA)) : '')].filter(Boolean).join(' \u00b7 ')});
  });
  var activas = ins.active_all || [];
  activas.forEach(function(a){
    var t1 = tsDe(a.effective); if (!t1) return;
    iv.push([t1, hoy]);
    ev.push({ts: t1, cls: 'ok',
      t: esc(a.insurer || '-') + ' <span class="iht rep" style="background:#e6f4ee;color:#12805c">Active</span>',
      m: [esc(tipoHumano(a.form)), 'since ' + esc(fFecha(a.effective)) +
          ' \u00b7 ' + durTxt(Math.max(0, Math.round((hoy - t1) / DIA)))].filter(Boolean).join(' \u00b7 ') +
         (a.pending_cancel && a.cancel_effective ? ' \u00b7 pending cancellation ' + esc(fFecha(a.cancel_effective)) : '')});
  });
  if (!ev.length) {
    return '<p class="empty">Not enough dated FMCSA records to build a timeline.</p>';
  }
  // 3) Fusion de intervalos y gaps
  iv.sort(function(x, y){ return x[0] - y[0]; });
  var fus = [];
  iv.forEach(function(x){
    if (fus.length && x[0] <= fus[fus.length-1][1] + DIA) {
      if (x[1] > fus[fus.length-1][1]) fus[fus.length-1][1] = x[1];
    } else fus.push([x[0], x[1]]);
  });
  for (var g = 1; g < fus.length; g++) {
    var dd = Math.round((fus[g][0] - fus[g-1][1]) / DIA);
    if (dd >= 7) ev.push({ts: fus[g-1][1] + 1, cls: 'gap',
      t: 'No coverage on file \u00b7 ' + dd + ' days',
      m: fTs(fus[g-1][1]) + ' \u2013 ' + fTs(fus[g][0])});
  }
  if (fus.length && !activas.length) { // gap abierto hasta hoy: SIEMPRE
    var fin = fus[fus.length-1][1];
    var dd2 = Math.round((hoy - fin) / DIA);
    if (dd2 >= 1) ev.push({ts: fin + 1, cls: 'gap',
      t: 'No coverage on file \u00b7 ' + dd2 + ' days and counting',
      m: 'Since ' + fTs(fin)});
  }
  // 4) Hoy: estado + autoridad (sin rojo para no_filing: intrastate)
  var p = ins.carrier && ins.carrier.prof;
  var aut = '';
  if (p && p.auth) {
    var aC = authHumano(p.auth.com), aN = authHumano(p.auth.con), aB = authHumano(p.auth.brk);
    var partes = [];
    if (aC[0] !== '-') partes.push('Common ' + aC[0]);
    if (aN[0] !== '-') partes.push('Contract ' + aN[0]);
    if (aB[0] !== '-') partes.push('Broker ' + aB[0]);
    aut = partes.length ? 'Authority: ' + partes.join(' \u00b7 ')
                        : 'No for-hire operating authority on record';
  }
  ev.push({ts: hoy + 1, cls: (ins.active ? 'ok' : ''), t: 'Today',
    m: (ins.active ? 'Covered by ' + esc(ins.active.insurer || '-')
        : (ins.no_filing ? 'No FMCSA insurance filing on record'
                         : 'No active insurance on file')) +
       (aut ? ' \u00b7 ' + esc(aut) : '')});
  ev.sort(function(a, b){ return b.ts - a.ts; }); // v6.15: Today arriba
  var H = '<div class="icard">' + labelIco('cal', 'Company timeline') + '<div class="tl">';
  ev.forEach(function(e){
    H += '<div class="tle' + (e.cls ? ' ' + e.cls : '') + '"><p class="tlt">' + e.t + '</p>' +
         (e.m ? '<p class="tlm">' + e.m + '</p>' : '') + '</div>';
  });
  H += '</div>' +
    '<p class="ocap" style="margin:10px 0 0">Built from federal FMCSA filings (L&amp;I insurance, MCS-150 registration). ' +
    'Coverage gaps reflect filing records \u2014 gaps shorter than 7 days are not shown. ' +
    'Confirm with the client before quoting.</p></div>';
  H += '<p class="ifoot">FMCSA L&amp;I + registration data \u00b7 Updated ' + esc(ins.updated_at || '') + '</p>';
  return H;
}
function cuerpoCarrier(ins){
  var carrier = ins && ins.carrier;
  // Sin bloque carrier (JSON pre-v24.3 o QCMobile caido al enriquecer)
  if (!carrier) {
    return '<p class="empty">Carrier profile could not be verified with FMCSA.<br>' +
      'It refreshes automatically \u2014 try again later.</p>';
  }
  // Con carrier pero sin perfil (JSON pre-v24.4 o cache en transicion)
  if (!carrier.prof) {
    return '<p class="empty">Carrier profile not loaded yet.<br>' +
      'It refreshes automatically \u2014 reopen in a few minutes.</p>';
  }
  var p = carrier.prof, m = carrier.m150 || null, H = '';

  // 1) Fuera de servicio federal: banda roja arriba de todo
  if (p.allowed === 'N' || p.oos_date) {
    H += '<div class="iband red">FMCSA lists this carrier as not authorized to operate' +
      (p.oos_date ? ' \u2014 out-of-service order effective ' + esc(p.oos_date) : '') + '.</div>';
  }

  // 2) Operation & Authority
  var aCom = authHumano(p.auth && p.auth.com), aCon = authHumano(p.auth && p.auth.con), aBrk = authHumano(p.auth && p.auth.brk);
  H += '<div class="icard">' + labelIco('doc', 'Operation') +
    '<div class="drow"><span>Operation type</span><b>' + esc(p.op || '-') + '</b></div>' +
    '<div class="drow"><span>Allowed to operate</span><b>' + (p.allowed === 'Y' ? 'Yes' : p.allowed === 'N' ? 'No' : '-') + '</b></div>' +
    (m && m.cls ? '<div class="drow"><span>Classification</span><b style="text-align:right">' +
      esc(String(m.cls).split(';').map(function(s){ return s.trim().toLowerCase().replace(/\b[a-z]/g,
        function(c){ return c.toUpperCase(); }); }).filter(Boolean).join(', ')) + '</b></div>' : '') +
    (m && m.cargo && m.cargo.length ? '<div class="drow"><span>Cargo carried</span><b style="text-align:right">' +
      esc(m.cargo.map(etiquetaCargo).join(', ')) + '</b></div>' : '') +
    (m && m.hm ? '<div class="drow"><span>HazMat</span><b>' + (m.hm === 'Y' ? 'Authorized' : 'Not Authorized') + '</b></div>' : '') +
    '<div class="drow" style="border-bottom:0"><span>Authority</span></div>' +
    // v6.3: sin autoridad for-hire registrada (tipico intrastate):
    // una linea honesta en vez de tres chips vacios.
    ((aCom[0] === '-' && aCon[0] === '-' && aBrk[0] === '-')
      ? '<p class="ocap" style="margin:2px 0 0">No for-hire operating authority on record \u2014 common for intrastate carriers.</p>'
      : '<div class="achips">' +
          '<span class="achip ' + aCom[1] + '">Common: ' + aCom[0] + '</span>' +
          '<span class="achip ' + aCon[1] + '">Contract: ' + aCon[0] + '</span>' +
          '<span class="achip ' + aBrk[1] + '">Broker: ' + aBrk[0] + '</span>' +
        '</div>') + '</div>';

  // 2b) v6.9: contactos federales del carrier (Census MCS-150).
  // Solo pinta si el motor trajo algo — mapeo tolerante en v24.7.
  if (m && (m.off1 || m.off2 || m.tel || m.em || m.addr || m.add)) {
    H += '<div class="icard">' + labelIco('phone', 'Company contacts \u00b7 FMCSA registration') +
      (m.off1 ? '<div class="drow"><span>Officer</span><b>' + esc(m.off1) + '</b></div>' : '') +
      (m.off2 && m.off2 !== m.off1 ? '<div class="drow"><span>Officer 2</span><b>' + esc(m.off2) + '</b></div>' : '') +
      (m.tel ? '<div class="drow"><span>Phone</span><b><a href="tel:' + esc(String(m.tel).replace(/\D/g,'')) + '" style="color:inherit">' + esc(fmtTel(m.tel)) + '</a></b></div>' : '') +
      (m.em ? '<div class="drow"><span>Email</span><b style="word-break:break-all">' + (lm3SafeUrl('mailto:'+m.em) ? '<a href="' + esc(lm3SafeUrl('mailto:'+m.em)) + '" style="color:inherit">' + esc(m.em) + '</a>' : esc(m.em)) + '</b></div>' : '') +
      (m.addr ? '<div class="drow"><span>Address</span><b style="text-align:right"><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(m.addr) + '" style="color:inherit">' + esc(m.addr) + '</a></b></div>' : '') +
      (m.add ? '<div class="drow" style="border-bottom:0"><span>DOT active since</span><b>' + esc(fechaIso(m.add)) + '</b></div>' : '') +
      '<p class="ocap" style="margin:6px 0 0">From the carrier\u2019s federal MCS-150 filing \u2014 compare with what the lead provided.</p></div>';
  }

  // 2b2) v6.16 (Fase 4B): related companies (bloque rel, motor
  // v24.10). Semantica: undefined = no cargado (pre-v24.10 o red
  // caida) => nota "not loaded yet" (regla 6: red caida != "no
  // hay"); [] = buscado y sin relacionados => tarjeta honesta
  // (tambien es dato de venta); [...] = relacionados con chips del
  // campo que matchea. Un hermano Inactive ES la senal chameleon.
  var rel = ins.rel;
  if (rel === undefined) {
    H += '<p class="ocap" style="margin:0 0 10px;text-align:center">Related companies not loaded yet \u2014 it refreshes automatically.</p>';
  } else {
    var VIA_LBL = {officer: 'Same officer', name: 'Same legal name',
      phone: 'Same phone', email: 'Same email', address: 'Same address'};
    // v6.17: el officer compartido es el del propio carrier (mismo
    // registro Census) — mostrar el nombre es accionable para el
    // agente. Colapso de espacios SOLO en display.
    if (m && m.off1) VIA_LBL.officer = 'Officer: ' + String(m.off1).replace(/\s+/g, ' ').trim();
    H += '<div class="icard">' + labelIco('doc', 'Related companies \u00b7 FMCSA Census');
    if (!rel.length) {
      H += '<p class="ocap" style="margin:2px 0 0">No other DOT shares this carrier\u2019s officer, legal name, phone, email or address in the current Census.</p></div>';
    } else {
      rel.forEach(function (r) {
        var inact = r.st && r.st !== 'A';
        H += '<div class="relr">' +
          '<p class="tlt">DOT ' + esc(r.dot) + ' \u00b7 ' + esc(r.nm || '-') +
            (inact ? ' <span class="iht rep" style="background:#fdecea;color:#b42318">Inactive</span>'
                   : ' <span class="iht rep" style="background:#e6f4ee;color:#12805c">Active</span>') + '</p>' +
          (function () {
            var m2 = [
              (r.pu != null ? r.pu + ' power units' : ''),
              (r.drv != null ? r.drv + ' drivers' : ''),
              (r.ad ? 'registered ' + esc(fechaIso(r.ad)) : '')
            ].filter(Boolean).join(' \u00b7 ');
            return m2 ? '<p class="tlm">' + m2 + '</p>' : '';
          })() +
          '<div class="achips" style="margin-top:5px">' +
            (r.via || []).map(function (v) {
              return '<span class="achip">' + esc(VIA_LBL[v] || v) + '</span>';
            }).join('') + '</div></div>';
      });
      H += '<p class="ocap" style="margin:9px 0 0">Companies sharing this carrier\u2019s federal registration details \u2014 possible prior or successor operations (chameleon pattern). An inactive sibling with a bad record changes the risk picture: verify before quoting.</p></div>';
    }
  }
  // 2c) v6.10: resumen de flota y conductores del MCS-150 (Census)
  if (m && (m.trk != null || m.cdl != null || m.di != null || m.din != null)) {
    H += '<div class="icard">' + labelIco('truck', 'Fleet & drivers \u00b7 MCS-150') +
      '<div class="cstats" style="grid-template-columns:repeat(' +
        [m.trk, m.cdl, m.di, m.din].filter(function(x){ return x != null; }).length + ',1fr)">' +
      (m.trk != null ? '<div class="cs"><b>' + m.trk + '</b><span>Trucks</span></div>' : '') +
      (m.cdl != null ? '<div class="cs"><b>' + m.cdl + '</b><span>CDL drivers</span></div>' : '') +
      (m.di != null ? '<div class="cs"><b>' + m.di + '</b><span>Interstate</span></div>' : '') +
      (m.din != null ? '<div class="cs"><b>' + m.din + '</b><span>Intrastate</span></div>' : '') +
      '</div></div>';
  }

  // 3) Safety: barras OOS + rating
  H += '<div class="icard">' + labelIco('gauge', 'Out of service rates \u00b7 last 24 months') +
    barraOos('Driver OOS', p.oos && p.oos.d) +
    barraOos('Vehicle OOS', p.oos && p.oos.v) +
    ((p.oos && p.oos.h && p.oos.h.i) ? barraOos('Hazmat OOS', p.oos.h) : '') +
    '</div>';
  H += '<div class="icard">' + labelIco('shield', 'Safety rating') +
    '<div class="drow" style="border-bottom:0"><span>FMCSA safety rating</span><b>' +
    (p.rate ? esc(p.rate) + (p.rate_date ? ' \u00b7 ' + esc(p.rate_date) : '') : 'Not Available') + '</b></div>' +
    (p.rate ? '' : '<p class="ocap" style="margin:4px 0 0">Most carriers are unrated \u2014 FMCSA only rates after a compliance review.</p>') +
    '</div>';

  // 4) Crashes (ventana SMS de 24 meses)
  var c = p.crash || {};
  var cv = function(x){ return (x === null || x === undefined) ? '-' : x; };
  H += '<div class="icard">' + labelIco('wrench', 'Crashes \u00b7 last 24 months') +
    '<div class="cstats">' +
      '<div class="cs"><b>' + cv(c.t) + '</b><span>Total</span></div>' +
      '<div class="cs"><b>' + cv(c.f) + '</b><span>Fatal</span></div>' +
      '<div class="cs"><b>' + cv(c.i) + '</b><span>Injury</span></div>' +
      '<div class="cs"><b>' + cv(c.tw) + '</b><span>Tow-away</span></div>' +
    '</div></div>';

  // 4b) v6.8 (Fase 3): Flota vista en inspecciones (VINs + vPIC).
  // Es una MUESTRA (solo unidades inspeccionadas), y el panel lo dice.
  var fl = ins.fleet;
  if (fl && fl.list && fl.list.length) {
    H += '<div class="icard">' + labelIco('truck', 'Fleet \u00b7 seen in roadside inspections');
    fl.list.forEach(function(f, i){
      var linea = lineaVehiculo(f);
      var esTrailer = /trailer/i.test(f.t || '');
      var viols = violacionesDeVin(ins, f.vin);
      H += '<div class="fitem" id="fitem-' + i + '" data-fleet-index="' + i + '">' +
        '<div><b>' + ico(esTrailer ? 'trailer' : 'truck') + (linea ? esc(linea) : esc(f.mk || '-')) + '</b>' +
        '<span class="ftype">' + [
          (f.t ? esc(tipoVehiculo(f.t)) : ''),
          (f.lic ? esc((f.lst ? f.lst + ' ' : '') + f.lic) : ''),
          (viols.length ? viols.length + ' violation' + (viols.length === 1 ? '' : 's') : '')
        ].filter(Boolean).join(' \u00b7 ') + '</span></div>' +
        '<span class="fvin">' + esc(f.vin) + '</span>' +
        '<svg class="ic fchev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" ' +
          'stroke-linecap="round" stroke-linejoin="round" style="margin:0"><path d="M4 6l4 4 4-4"/></svg>' +
      '</div>' +
      '<div class="fdet" id="fdet-' + i + '">' +
        (f.t ? '<div class="drow"><span>Type</span><b>' + esc(tipoVehiculo(f.t)) + '</b></div>' : '') +
        (f.y ? '<div class="drow"><span>Model year</span><b>' + esc(f.y) + '</b></div>' : '') +
        (f.g ? '<div class="drow"><span>GVWR class</span><b style="text-align:right">' + esc(f.g) + '</b></div>' : '') +
        (f.lic ? '<div class="drow"><span>Plate</span><b>' + esc((f.lst ? f.lst + ' ' : '') + f.lic) + '</b></div>' : '') +
        '<div class="drow" style="border-bottom:0"><span>VIN</span><b style="letter-spacing:.4px">' + esc(f.vin) + '</b></div>' +
        (viols.length
          ? '<div class="vlist">' + viols.map(function(v){
              return '<div class="vitem' + (v.o ? ' voos' : '') + '">' +
                '<div class="inh"><div class="vd">' + esc(v.txt || v.c) + '</div>' +
                  '<span class="vchip ' + (v.o ? 'oos' : 'warn') + '">' + (v.o ? 'OOS' : 'Warning') + '</span></div>' +
                '<div class="vm">' + esc(fechaIso(v.d) || v.d || '') + ' \u00b7 ' + esc(v.c || '') + '</div></div>';
            }).join('') + '</div>'
          : '<p class="ocap" style="margin:6px 0 8px">No violations recorded for this vehicle.</p>') +
      '</div>';
    });
    H += '<p class="ocap" style="margin:8px 0 0">Tap a vehicle for details \u00b7 Seen in roadside inspections \u2014 may not be the full fleet.</p></div>';
  } else if (ins.insp && ins.insp.n > 0) {
    H += '<div class="icard"><p class="label">Fleet \u00b7 seen in roadside inspections</p>' +
      '<p class="ocap" style="margin:0">No VINs recorded in this carrier\u2019s inspections.</p></div>';
  }

  // 5) Mileage / MCS-150 (Census; honesto si falta)
  H += '<div class="icard">' + labelIco('cal', 'Mileage info') +
    (m
      ? '<div class="drow"><span>Annual mileage</span><b>' +
          (m.mi ? esc(fmtMillas(m.mi)) + ' mi' : '-') + '</b></div>' +
        '<div class="drow"><span>Reported year</span><b>' + esc(m.yr || '-') + '</b></div>' +
        '<div class="drow" style="border-bottom:0"><span>MCS-150 update</span><b>' +
          (m.date ? esc(fechaIso(m.date)) : '-') + '</b></div>'
      : '<p class="ocap" style="margin:0">MCS-150 data not available from the FMCSA Census file.</p>') +
    '</div>';

  // 6) Pie
  H += '<p class="ifoot">FMCSA QCMobile + Census data \u00b7 Updated ' + esc(ins.updated_at || '') + '<br>' +
    '<a href="https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=' +
    encodeURIComponent(ins.dot || '') + '" target="_blank" rel="noopener">View SAFER snapshot</a></p>';
  return H;
}

// ── v6.4: FULL DETAILS AGRUPADO ──
// Mapa etiqueta (lowercase) -> grupo. Lo no reconocido cae en
// "Other details": NINGUNA fila del motor se pierde jamas.
// v6.5: orden de VENTA — calificacion primero, contacto al final
// (llamar/escribir ya vive en los botones del hero). Dentro de cada
// grupo las filas se ordenan segun esta lista (NAICS/SIC arriba de
// Description, pedido de Rodrigo).
// v6.6: orden final decidido por Rodrigo — Contact arriba, Coverage
// answers al cierre. NAICS/SIC sigue primero en Business profile.
// == v6.27: RELOJ LOCAL DEL CLIENTE + TAP-TO-COPY ==
// Zona derivada del ESTADO en el Address (formato canonico del
// motor: "..., Ciudad, Estado ZIP"). Estados partidos (FL/TX/KY/TN/
// ID/OR/ND/SD/NE/KS/MI/IN) usan la zona MAYORITARIA — aproximacion
// documentada; el objetivo es "puedo llamar ya o es muy temprano".
var TZ_ZONAS = {
  ET:{tz:'America/New_York', n:'Eastern'},
  CT:{tz:'America/Chicago', n:'Central'},
  MT:{tz:'America/Denver', n:'Mountain'},
  AZ:{tz:'America/Phoenix', n:'Arizona (no DST)'},
  PT:{tz:'America/Los_Angeles', n:'Pacific'},
  AK:{tz:'America/Anchorage', n:'Alaska'},
  HI:{tz:'Pacific/Honolulu', n:'Hawaii'}};
var TZ_ESTADO = {
  CONNECTICUT:'ET', DELAWARE:'ET', 'DISTRICT OF COLUMBIA':'ET', FLORIDA:'ET',
  GEORGIA:'ET', INDIANA:'ET', KENTUCKY:'ET', MAINE:'ET', MARYLAND:'ET',
  MASSACHUSETTS:'ET', MICHIGAN:'ET', 'NEW HAMPSHIRE':'ET', 'NEW JERSEY':'ET',
  'NEW YORK':'ET', 'NORTH CAROLINA':'ET', OHIO:'ET', PENNSYLVANIA:'ET',
  'RHODE ISLAND':'ET', 'SOUTH CAROLINA':'ET', VERMONT:'ET', VIRGINIA:'ET',
  'WEST VIRGINIA':'ET',
  ALABAMA:'CT', ARKANSAS:'CT', ILLINOIS:'CT', IOWA:'CT', KANSAS:'CT',
  LOUISIANA:'CT', MINNESOTA:'CT', MISSISSIPPI:'CT', MISSOURI:'CT',
  NEBRASKA:'CT', 'NORTH DAKOTA':'CT', OKLAHOMA:'CT', 'SOUTH DAKOTA':'CT',
  TENNESSEE:'CT', TEXAS:'CT', WISCONSIN:'CT',
  COLORADO:'MT', IDAHO:'MT', MONTANA:'MT', 'NEW MEXICO':'MT', UTAH:'MT',
  WYOMING:'MT', ARIZONA:'AZ',
  CALIFORNIA:'PT', NEVADA:'PT', OREGON:'PT', WASHINGTON:'PT',
  ALASKA:'AK', HAWAII:'HI'};
var TZ_ABREV = {AL:'ALABAMA',AK:'ALASKA',AZ:'ARIZONA',AR:'ARKANSAS',
  CA:'CALIFORNIA',CO:'COLORADO',CT:'CONNECTICUT',DE:'DELAWARE',
  DC:'DISTRICT OF COLUMBIA',FL:'FLORIDA',GA:'GEORGIA',HI:'HAWAII',ID:'IDAHO',
  IL:'ILLINOIS',IN:'INDIANA',IA:'IOWA',KS:'KANSAS',KY:'KENTUCKY',LA:'LOUISIANA',
  ME:'MAINE',MD:'MARYLAND',MA:'MASSACHUSETTS',MI:'MICHIGAN',MN:'MINNESOTA',
  MS:'MISSISSIPPI',MO:'MISSOURI',MT:'MONTANA',NE:'NEBRASKA',NV:'NEVADA',
  NH:'NEW HAMPSHIRE',NJ:'NEW JERSEY',NM:'NEW MEXICO',NY:'NEW YORK',
  NC:'NORTH CAROLINA',ND:'NORTH DAKOTA',OH:'OHIO',OK:'OKLAHOMA',OR:'OREGON',
  PA:'PENNSYLVANIA',RI:'RHODE ISLAND',SC:'SOUTH CAROLINA',SD:'SOUTH DAKOTA',
  TN:'TENNESSEE',TX:'TEXAS',UT:'UTAH',VT:'VERMONT',VA:'VIRGINIA',
  WA:'WASHINGTON',WV:'WEST VIRGINIA',WI:'WISCONSIN',WY:'WYOMING'};
var CLIENT_TZ = null;
function zonaDeDetalles(details){
  var addr = '';
  (details || []).forEach(function(x){
    if (String(x[0] || '').toLowerCase().trim() === 'address') addr = String(x[1] || '');
  });
  if (!addr) return null;
  var cola = addr.split(',').pop() || '';
  var sinZip = cola.replace(/\b\d{5}(?:-\d{4})?\b/g, '').trim();
  var nombre = sinZip.replace(/[^A-Za-z ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  var llave = TZ_ESTADO[nombre] || TZ_ESTADO[TZ_ABREV[nombre] || ''] || null;
  return llave ? TZ_ZONAS[llave] : null;
}
function filaReloj(z){
  if (!z) return '';
  return '<div class="drow tzrow"><span>Client local time</span>' +
    '<b><span class="cclock" data-tz="' + esc(z.tz) + '">--:--:--</span> \u00b7 ' + esc(z.n) + '</b></div>';
}
setInterval(function(){
  var els = document.querySelectorAll('.cclock');
  if (!els.length) return;
  Array.prototype.forEach.call(els, function(el){
    try {
      el.textContent = new Intl.DateTimeFormat('en-US',
        {hour:'numeric', minute:'2-digit', second:'2-digit', hour12:true,
         timeZone: el.getAttribute('data-tz')}).format(new Date());
    } catch (e) { el.textContent = ''; }
  });
}, 1000);
// Tap en una fila de Lead details = copiar el VALOR. Los links
// mailto:/tel: conservan su accion; la fila del reloj no copia.
function copiarLegacy(txt){
  var ta = document.createElement('textarea');
  ta.value = txt; ta.setAttribute('readonly', '');
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
}
function copiarTexto(txt){
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(toastCopiado,
      function(){ copiarLegacy(txt); toastCopiado(); });
  } else { copiarLegacy(txt); toastCopiado(); }
}
var _toastT = null;
function toastCopiado(){
  var el = document.getElementById('copytoast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'copytoast'; el.className = 'copytoast';
    el.textContent = 'Copied to clipboard';
    document.body.appendChild(el);
  }
  el.classList.add('show');
  clearTimeout(_toastT);
  _toastT = setTimeout(function(){ el.classList.remove('show'); }, 1400);
}
document.addEventListener('click', function(ev){
  var el = ev.target;
  var row = el.closest ? el.closest('.drow') : null;
  if (!row) return;
  if (!row.closest('.dets') && !row.closest('details.card')) return;
  if (row.classList.contains('tzrow')) return;
  if (el.closest('a')) return;
  var b = row.querySelector('b, .pv');
  var txt = b ? String(b.textContent || '').trim() : '';
  if (!txt) return;
  copiarTexto(txt);
});

var GRUPOS_DET = [
  ['Contact', ['email','address','phone']],
  ['Business profile', ['naics / sic','description','category','business type','years in business','owner experience']],
  ['Financials', ['revenue','payroll','subcontractors','ft employees']],
  ['Coverage answers', ['annual policy','currently insured','quoted elsewhere']]
];
// Montos que se normalizan a $X,XXX (FT employees es conteo, no dinero)
var MONEY_DET = ['revenue','payroll','subcontractors'];
function grupoDetalles(details){
  var usados = {}, out = [];
  GRUPOS_DET.forEach(function(g){
    var filas = [];
    (details || []).forEach(function(x, i){
      if (usados[i]) return;
      if (g[1].indexOf(String(x[0] || '').toLowerCase().trim()) !== -1) { usados[i] = 1; filas.push(x); }
    });
    // v6.5: orden interno segun la lista del grupo (NAICS/SIC primero)
    filas.sort(function(a, b){
      return g[1].indexOf(String(a[0]).toLowerCase().trim()) - g[1].indexOf(String(b[0]).toLowerCase().trim());
    });
    if (filas.length) out.push({t: g[0], f: filas});
  });
  var resto = [];
  (details || []).forEach(function(x, i){ if (!usados[i]) resto.push(x); });
  if (resto.length) out.push({t: 'Other details', f: resto});
  return out;
}
function filaDet(x){
  var v = String(x[1] === null || x[1] === undefined ? '' : x[1]);
  var etiqueta = String(x[0] || '').toLowerCase().trim();
  var low = v.trim().toLowerCase(), val;
  // v6.5: montos normalizados — el motor a veces manda "300,000" y a
  // veces "$60,000"; aqui salen SIEMPRE como $X,XXX. Solo si el valor
  // es numerico limpio; cualquier otra cosa se muestra tal cual.
  if (MONEY_DET.indexOf(etiqueta) !== -1) {
    var num = v.replace(/[$,\s]/g, '');
    if (/^\d+(\.\d+)?$/.test(num)) v = '$' + Number(num).toLocaleString('en-US');
    low = '';
  }
  if (low === 'yes') val = '<span class="pv yes">Yes</span>';
  else if (low === 'no') val = '<span class="pv no">No</span>';
  else if (etiqueta === 'email' && lm3SafeUrl('mailto:'+v))
    val = '<b><a class="dlink" href="mailto:' + esc(v) + '">' + esc(v) + '</a></b>';
  else val = '<b>' + esc(v) + '</b>';
  return '<div class="drow"><span>' + esc(x[0]) + '</span>' + val + '</div>';
}


// ── v6.19: BUSINESS VERIFY / DIGITAL FINGERPRINT ─────────────────
// Boton bajo la fila de Insurance; sheet propio (sheet--vfy) con
// tabs Verify | Fingerprint | Benchmarks — el ORDEN es el mensaje.
// Data on-demand via api=verify (el motor la enriquece post-correo).
// La tarjeta presenta HALLAZGOS: jamas instruye a la agente, jamas
// acusa, y un "not found" automatico NUNCA se pinta como "no existe".
var vfyAbierto = null;

// v6.20: header con boton X. El cierre se delega en el sheet
// (sobrevive cada innerHTML; overlay-tap sigue cerrando igual).
function vHeadHTML(chip){
  return '<div class="vhead"><h2>Business Verify</h2>' +
    '<span style="display:flex;align-items:center;gap:8px">' + (chip || '') +
    '<button type="button" class="vx" id="vfy-x" aria-label="Close">\u2715</button></span></div>';
}

function filaVerifyDetalle(d){
  return '<button type="button" class="insrow" id="btn-vfy">' +
    '<span class="idot gray"></span>' +
    '<span class="imain"><span class="ittl">Digital Fingerprint \u00b7 Business Verify</span>' +
    '<span class="ival">Pre-call verification \u2014 tap to open</span></span>' +
    '<span class="ichev">&#8250;</span></button>';
}

function cerrarVerify(){
  if (!vfyAbierto) return;
  var el = vfyAbierto; vfyAbierto = null;
  el.ov.classList.remove('on'); el.sh.classList.remove('on');
  setTimeout(function(){ if (el.ov.parentNode) el.ov.parentNode.removeChild(el.ov);
    if (el.sh.parentNode) el.sh.parentNode.removeChild(el.sh); }, 240);
}





// Chip por estado de celda — la AUSENCIA tambien es informacion.
function vChip(st){
  if (st === 'VERIFIED' || st === 'OK' || st === 'OBSERVED') return '<span class="achip ok">Verified</span>';
  if (st === 'FOUND') return '<span class="achip warn">Records found</span>';
  if (st === 'NOT_FOUND_FLAG') return '<span class="achip bad">Not found \u2014 review</span>';
  if (st === 'NOT_FOUND_EXPECTED') return '<span class="achip">Not found (expected)</span>';
  if (st === 'NOT_FOUND') return '<span class="achip">No automated findings</span>';
  if (st === 'DEEPLINK') return '<span class="achip">Manual check</span>';
  if (st === 'INFO') return '<span class="achip">Info</span>';
  if (st === 'SKIPPED') return '<span class="achip">Not run</span>';
  return '<span class="achip">N/A</span>';
}
function vChipGlobal(v){
  if (!v) return '<span class="achip">Pending</span>';
  if ((v.flags || []).length || (v.reg && v.reg.st === 'NOT_FOUND_FLAG'))
    return '<span class="achip bad">Review</span>';
  if (v.reg && v.reg.st === 'VERIFIED') return '<span class="achip ok">Verified</span>';
  return '<span class="achip warn">Partial</span>';
}
function vLink(url, txt){
  if (!url) return esc(txt || '');
  var safe=lm3SafeUrl(url);
  if(!safe)return esc(txt || url);
  return '<a class="vlink" target="_blank" rel="noopener" href="' + esc(safe) + '">' + esc(txt) + '</a>';
}

// ── Tab 1: VERIFY (identidad y contexto regulatorio) ──
function vTabVerifyHTML(v){
  var H = '';
  var r = v.reg || {}, l = v.lic || {}, w = v.wc || {}, o = v.osha || {};
  var fm = v.fmcsa || null, ec = v.echo || null;
  var ms = (v.ops && v.ops.matches) || [];
  var pills = function(keys){ return (keys || []).map(function(k){
    return '<span class="achip">' + esc(k) + '</span>'; }).join(' '); };

  // v6.25 — WHAT WE FOUND: solo hallazgos reales, cada uno como una
  // oracion con su evidencia (llaves), coherencia vs lo declarado,
  // reviews y fuente. Es lo PRIMERO que ve la agente para confirmar
  // con el cliente ("se encontro el LLC tal, coincide con...").
  var F = [];
  ms.forEach(function(m){
    var fuerte = m.grade === 'strong';
    F.push('<div class="vfind"><p class="vkv" style="margin:0"><b>' + esc(m.tn) + '</b> ' +
      '<span class="achip ' + (fuerte ? 'ok' : 'warn') + '">' + (fuerte ? 'Strong match' : 'Possible match') + '</span> ' +
      pills(m.keys) + '</p>' +
      '<p class="vkv" style="margin:4px 0 0">' +
      (fuerte ? 'Found under the lead\u2019s ' + esc((m.keys || []).join(' and '))
              : 'Matched on one key only \u2014 to confirm on the call') +
      ((m.obs || []).length ? ' \u00b7 advertises ' + esc(m.obs.slice(0, 4).join(', ')) : '') + '.' +
      (m.coh === 'match' ? ' <span class="achip ok">Matches the declared line</span>' :
       m.coh === 'differs' ? ' <span class="achip warn">Differs from the declared line</span>' : '') + '</p>' +
      (m.rev ? '<p class="vkv" style="margin:4px 0 0">Reviews found for ' + esc(m.tn) + ': ' + esc(m.rev) + '</p>' : '') +
      '</div>');
  });
  if (r.st === 'VERIFIED') {
    F.push('<div class="vfind"><p class="vkv" style="margin:0"><b>' + esc(r.nm || '') + '</b> ' +
      '<span class="achip ok">State-registered</span>' +
      (r.status ? ' <span class="achip">' + esc(r.status) + '</span>' : '') + '</p>' +
      '<p class="vkv" style="margin:4px 0 0">' +
      (r.formed ? 'Formed ' + esc(r.formed) : 'Registration on file') +
      (r.agent ? ' \u00b7 registered agent ' + esc(r.agent) : '') + '.' +
      (r.addr_match === 'match' ? ' <span class="achip ok">Address matches lead</span>' :
       r.addr_match === 'differs' ? ' <span class="achip warn">Address differs from lead</span>' : '') +
      '</p></div>');
  }
  if (fm && fm.st === 'FOUND') {
    F.push('<div class="vfind"><p class="vkv" style="margin:0"><b>Federal carrier census</b> ' +
      '<span class="achip warn">Possible match</span></p>' +
      (fm.hits || []).map(function(h){
        return '<p class="vkv" style="margin:4px 0 0">DOT ' + esc(h.dot) + ' \u00b7 ' + esc(h.nm) +
          ' ' + pills(h.by) + '</p>'; }).join('') + '</div>');
  }
  if (ec && ec.st === 'FOUND') {
    F.push('<div class="vfind"><p class="vkv" style="margin:0"><b>EPA records</b> ' +
      '<span class="achip warn">Records found</span></p>' +
      '<p class="vkv" style="margin:4px 0 0">' + ec.n + ' regulated facility record(s) under the business name' +
      (ec.pen && ec.pen !== '$0' ? ' \u00b7 penalties on file ' + esc(ec.pen) : '') + '.</p></div>');
  }
  if (o.st === 'FOUND') {
    F.push('<div class="vfind"><p class="vkv" style="margin:0"><b>OSHA history</b> ' +
      '<span class="achip warn">Records found</span></p>' +
      '<p class="vkv" style="margin:4px 0 0">' + o.n + ' inspection record(s)' +
      (o.last ? ' \u00b7 most recent ' + esc(o.last) : '') + '.</p></div>');
  }
  var srcs = ((v.ops && v.ops.links) || []).slice(0, 2)
    .map(function(L){ return vLink(L.u, L.t ? ('Source: ' + L.t).slice(0, 60) : 'Source'); }).join('');
  // v6.26 (M4, leccion OSHA v6.23): el hero distingue "no corrio"
  // (SKIPPED) de "corrio y no matcheo" (NOT_FOUND) — un no-corrido
  // jamas se pinta como resultado negativo.
  H += '<div class="icard">' + labelIco('gauge', 'What we found') +
    (F.length ? F.join('') + srcs
      : (v.ops && v.ops.st === 'SKIPPED'
        ? '<p class="vkv">The automated search could not run for this lead \u2014 nothing was searched, so this is not a finding.</p>'
        : '<p class="vkv">Nothing in public sources matched this business\u2019s hard keys (phone, street number, name). This is context, not a conclusion \u2014 social-media-only presence is often invisible here.</p>')) +
    '</div>';

  // AI summary — solo si trae bullets.
  if (v.tp && v.tp.b && v.tp.b.length) {
    H += '<div class="icard">' + labelIco('gauge', 'Before you call') +
      '<ul class="tpul">' + v.tp.b.slice(0, 4).map(function(b){
        return '<li>' + esc(b) + '</li>'; }).join('') + '</ul></div>';
  }
  if ((v.flags || []).length) {
    H += '<div class="icard">' + labelIco('gauge', 'Flags') +
      v.flags.map(function(f){ return '<p class="vkv">\u2022 ' + esc(f.t) + '</p>'; }).join('') + '</div>';
  }

  // Tarjetas de detalle SOLO informativas.
  if (r.st === 'NOT_FOUND_FLAG') {
    H += '<div class="icard">' + labelIco('gauge', 'State registration') + vChip(r.st) +
      '<p class="vkv">No registration under the exact name in the state registry.</p>' +
      vLink(r.url, 'Open state search') + '</div>';
  }
  if (w.mono || (w.st === 'INFO' && w.det)) {
    H += '<div class="icard">' + labelIco('gauge', 'Workers\u2019 comp context') + vChip(w.st) +
      (w.mono ? '<p class="vkv"><b>Monopolistic state.</b></p>' : '') +
      (w.det ? '<p class="vkv">' + esc(w.det) + '</p>' : '') + '</div>';
  }
  if (l.st === 'INFO' && l.det) {
    H += '<div class="icard">' + labelIco('gauge', 'Licensing') + vChip(l.st) +
      '<p class="vkv">' + esc(l.det) + '</p>' + vLink(l.url, 'Open license lookup') + '</div>';
  }

  // Other checks — lo callado, compacto, con sus botones manuales.
  var Q = [], B = [];
  if (r.st !== 'VERIFIED' && r.st !== 'NOT_FOUND_FLAG') {
    Q.push('<b>State registration:</b> ' + (r.st === 'NOT_FOUND_EXPECTED'
      ? 'no exact-name record \u2014 consistent with a new or unregistered trade name'
      : 'manual lookup for this state'));
    if (r.url) B.push(vLink(r.url, 'State registry'));
  }
  if (!(l.st === 'INFO' && l.det)) {
    Q.push('<b>Licensing:</b> ' + (l.st === 'NOT_APPLICABLE'
      ? 'no trade-specific license for this category' : 'manual lookup'));
    if (l.url) B.push(vLink(l.url, 'License lookup'));
  }
  if (o.st !== 'FOUND') {
    Q.push('<b>OSHA:</b> ' + (o.st === 'NOT_FOUND_EXPECTED'
      ? 'no inspection records matched' : 'not run \u2014 manual search available'));
    if (o.url) B.push(vLink(o.url, 'OSHA search'));
  }
  if (ec && ec.st !== 'FOUND' && ec.st !== 'NOT_APPLICABLE') {
    Q.push('<b>EPA:</b> ' + (ec.st === 'NOT_FOUND_EXPECTED'
      ? 'no regulated-facility records matched' : 'not run \u2014 manual search available'));
    if (ec.url) B.push(vLink(ec.url, 'EPA ECHO'));
  }
  if (fm && fm.st === 'NOT_FOUND')
    Q.push('<b>FMCSA:</b> no carrier census match by name, owner, or phone');
  if (Q.length) {
    H += '<div class="icard">' + labelIco('gauge', 'Other checks') +
      Q.map(function(q){ return '<p class="vkv" style="margin:4px 0">' + q + '</p>'; }).join('') +
      (B.length ? '<div style="margin-top:8px">' + B.join(' ') + '</div>' : '') + '</div>';
  }

  // UNA sola leyenda para todo el tab.
  H += '<p class="ocap" style="margin:10px 4px 0">Automated findings from public sources, graded by hard keys (2+ keys = strong, 1 = possible). Findings are context for the call, never a judgment.</p>';
  return H;
}

// ── Tab 2: FINGERPRINT (huella digital y operaciones publicadas) ──
function vTabFingHTML(v){
  var H = '';
  var p = v.ops || {};
  H += '<div class="icard">' + labelIco('gauge', 'Operations observed publicly') + vChip(p.st);
  if (p.st === 'OBSERVED') {
    // v6.25: los servicios viven en su match (dueno de la evidencia);
    // chips sueltos SOLO para celdas viejas sin matches. Direccion
    // solo si trae numero de calle (sin numero no verifica nada).
    if (!(p.matches || []).length && (p.obs || []).length)
      H += '<div class="achips" style="margin-top:8px">' + p.obs.map(function(x){
        return '<span class="achip ok">' + esc(x) + '</span>'; }).join('') + '</div>';
    if (p.addr_seen && /^\s*\d+/.test(String(p.addr_seen))) H += '<p class="vkv">Address seen publicly: ' + esc(p.addr_seen) +
      (p.addr_match === 'match' ? ' <span class="achip ok">Matches lead</span>' :
       p.addr_match === 'differs' ? ' <span class="achip warn">Differs from lead</span>' : '') + '</p>';
    if (p.web && p.web.reviews_signal) H += '<p class="vkv">Reviews signal: ' + esc(p.web.reviews_signal) + '</p>';
    // v6.24: matches del motor de cruce (v24.15) — evidencia por
    // llaves. FUERTE = 2+ llaves duras; POSIBLE = 1 llave, a
    // confirmar. Celdas viejas sin matches renderizan como antes.
    if ((p.matches || []).length) {
      H += (p.matches || []).map(function(m){
        var fuerte = m.grade === 'strong';
        return '<p class="vkv"><b>' + esc(m.tn) + '</b> ' +
          '<span class="achip ' + (fuerte ? 'ok' : 'warn') + '">' +
          (fuerte ? 'Strong match' : 'Possible match') + '</span> ' +
          '<span class="achip">matched by: ' + esc((m.keys || []).join(' + ')) + '</span>' +
          (m.coh === 'match' ? ' <span class="achip ok">Matches declared line</span>' :
           m.coh === 'differs' ? ' <span class="achip warn">Differs from declared line</span>' : '') +
          ((m.obs || []).length ? '<br>' + esc(m.obs.join(' \u00b7 ')) : '') +
          (m.rev ? '<br>Reviews: ' + esc(m.rev) : '') + '</p>';
      }).join('') +
      '<p class="ocap" style="margin:8px 0 0">Matches are graded by hard keys (2+ keys = strong, 1 = possible). A possible match is a lead to confirm, not a confirmed identity.</p>';
    } else if ((p.notes || []).length) {
      H += p.notes.map(function(n){
        return '<p class="vkv">\u2022 ' + esc(n) + '</p>'; }).join('');
    } else H += '<p class="vkv">No differences from the declared line were noted by the automated search.</p>';
    if ((p.links || []).length) H += '<p class="vkv" style="margin-top:6px">Sources:</p>' +
      p.links.map(function(L){ return vLink(L.u, L.t || 'source'); }).join('');
  } else if (p.st === 'NOT_FOUND') { // v6.22: copy corto del panel
    H += '<p class="vkv"><b>No automated findings.</b></p>' +
      '<p class="vkv">Nothing was compared against the declared operations.</p>' +
      '<p class="vkv">Social-media-only presence is often invisible to this search.</p>';
  } else {
    H += '<p class="vkv">Automated search was not run for this lead.</p>';
  }
  H += vLink(p.gq, 'Search: name + city') + vLink(p.gq2, 'Search: phone') +
    vLink(p.gq3, 'Search: owner + trade') +
    '<p class="ocap" style="margin:8px 0 0">Buttons open manual Google searches \u2014 one per key, unquoted.</p></div>';
  var w = v.web || {};
  H += '<div class="icard">' + labelIco('gauge', 'Email & domain') + vChip(w.st);
  if (w.dom) H += '<p class="vkv">Business domain: <b>' + esc(w.dom) + '</b>' +
    (w.dom_age ? ' \u00b7 registered ' + esc(w.dom_age) : '') + '</p>';
  if (w.det) H += '<p class="vkv">' + esc(w.det) + '</p>';
  H += '</div>';
  return H;
}

// ── Tab 3: BENCHMARKS (parametros oficiales — contexto, no juicio) ──
function vTabBenchHTML(v){
  var b = v.bench || {};
  var H = '<div class="icard">' + labelIco('gauge', 'Industry parameters (state level)') + vChip(b.st);
  if (b.st === 'OK') {
    H += '<p class="vkv"><b>' + b.estab + '</b> establishments of this NAICS class in the state (' + esc(b.yr || '') + ').</p>' +
      (b.emp_prom != null ? '<p class="vkv">Average employees per establishment: <b>' + b.emp_prom + '</b></p>' : '') +
      (b.pay_prom_emp != null ? '<p class="vkv">Average annual payroll per employee: <b>$' + Number(b.pay_prom_emp).toLocaleString('en-US') + ',000</b></p>' : '') +
      '<p class="ocap" style="margin:8px 0 0">Official U.S. Census (County Business Patterns). Comparison context for the declared figures \u2014 not a judgment.</p>';
  } else {
    H += '<p class="vkv">Benchmark data was not available for this lead\u2019s state/NAICS.</p>';
  }
  return H + '</div>';
}

function armarVerifySheet(sh, v){
  if (!v) {
    sh.innerHTML = vHeadHTML('<span class="achip">Pending</span>') +
      '<div style="padding:0 18px 18px"><p class="ocap">Verification is still running for this lead \u2014 it fills in automatically shortly after the lead arrives. Close and reopen in a minute.</p></div>';
    return;
  }
  sh.innerHTML = vHeadHTML(vChipGlobal(v)) +
    '<div class="stabs">' +
      '<button type="button" class="stab on" data-tab="vfy">Verify</button>' +
      '<button type="button" class="stab" data-tab="fng">Fingerprint</button>' +
      '<button type="button" class="stab" data-tab="bch">Benchmarks</button></div>' +
    '<div class="sbody" id="vbody"></div>';
  var cuerpo = sh.querySelector('#vbody');
  function pintar(cual){
    cuerpo.innerHTML = (cual === 'fng') ? vTabFingHTML(v)
      : (cual === 'bch') ? vTabBenchHTML(v) : vTabVerifyHTML(v);
    cuerpo.scrollTop = 0;
  }
  var tabs = sh.querySelectorAll('.stab');
  tabs.forEach(function(t){
    t.addEventListener('click', function(){
      tabs.forEach(function(x){ x.classList.remove('on'); });
      t.classList.add('on');
      pintar(t.getAttribute('data-tab'));
    });
  });
  pintar('vfy');
}

// Fila del DETALLE (bajo las notas). Sin DOT: cadena vacía.
function filaSeguroDetalle(d){
  if (!d.dot) return '';
  var etiqueta, s;
  if (d.insurance) {
    var e = estadoChip(d.insurance.c || null);
    s = e ? e.s : 'gray';
    if (d.insurance.carrier && d.insurance.carrier.exists === false) s = 'red';
    etiqueta = d.insurance.active ? (d.insurance.active.insurer || '-')
      : (d.insurance.carrier && d.insurance.carrier.exists === false ? 'DOT not found \u2014 check the number'
      : (d.insurance.no_filing ? 'No FMCSA filing on record' : 'No active insurance on file'));
  } else { s = 'gray'; etiqueta = 'Insurance \u2014 tap to load'; }
  return '<button type="button" class="insrow" id="btn-ins">' +
    '<span class="idot ' + claseDot(s) + '"></span>' +
    '<span class="imain"><span class="ittl">Insurance \u00b7 DOT ' + esc(d.dot) + '</span>' +
    '<span class="ival">' + esc(etiqueta) + '</span></span>' +
    '<span class="ichev">&#8250;</span></button>';
}

