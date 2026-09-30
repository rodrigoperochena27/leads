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
