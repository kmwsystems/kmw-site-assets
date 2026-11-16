(function fwcDevice() {
'use strict';
if (!document.getElementById('connection-form')) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fwcDevice); return; }
(() => {
'use strict';
const COMMANDS = {
systemInfo: '/cgi-bin/magicBox.cgi?action=getSystemInfo',
serialNumber: '/cgi-bin/magicBox.cgi?action=getSerialNo'
};
const getElement = id => document.getElementById(id);
const ip = getElement('ip');
const username = getElement('username');
const password = getElement('password');
const readButton = getElement('read');
const snButton = getElement('read-sn');
function parseHost(value) {
let input = value.trim();
const markdown = input.match(/^\[[^\]]*\]\((https?:\/\/[^\s]+)\)$/i);
if (markdown) input = markdown[1];
if (input.startsWith('<') && input.endsWith('>')) input = input.slice(1, -1);
if (!input || /\s|\\/.test(input)) {
throw new Error('Introdu un IP sau un URL valid.');
}
if (input.includes('://') && !/^https?:\/\//i.test(input)) {
throw new Error('Folosește HTTP sau HTTPS.');
}
const secure = /^https:\/\//i.test(input);
input = input.replace(/^https?:\/\//i, '').split(/[\/?#]/)[0];
if (input.includes('@')) {
throw new Error('Introdu utilizatorul și parola în câmpurile lor.');
}
if ((input.match(/:/g) || []).length > 1 && !input.startsWith('[')) input = '[' + input + ']';
const match = input.match(/^(\[[0-9a-f:.]+\]|\d{1,3}(?:\.\d{1,3}){3})(?::(\d{1,5}))?$/i);
if (!match) {
throw new Error('Adresă IP invalidă.');
}
const invalidIPv4 = !match[1].startsWith('[') && match[1].split('.').some(part => {
return Number(part) > 255 || (part.length > 1 && part[0] === '0');
});
if (invalidIPv4) {
throw new Error('Adresă IP invalidă.');
}
if (match[2] !== undefined && (Number(match[2]) < 1 || Number(match[2]) > 65535)) {
throw new Error('Portul trebuie să fie între 1 și 65535.');
}
let parsed;
try {
parsed = new URL('http://' + input);
} catch (_) {
throw new Error('Adresă IP invalidă.');
}
return {
host: parsed.hostname + (match[2] !== undefined ? ':' + Number(match[2]) : ''),
protocol: secure || Number(match[2]) === 443 ? 'https' : 'http'
};
}
function hostLabel({host, protocol}) {
return (protocol === 'https' ? 'https://' : '') + host;
}
function encodeCredential(value) {
return encodeURIComponent(value).replace(/[!'()*]/g, char => {
return '%' + char.charCodeAt(0).toString(16).toUpperCase();
});
}
function commandUrl(protocol, connection, command) {
const user = encodeCredential(connection.user);
const pass = encodeCredential(connection.pass);
return `${protocol}://${user}:${pass}@${connection.host}${command}`;
}
function showMessage(text = '') {
getElement('form-message').textContent = text;
getElement('form-message').hidden = !text;
}
function getConnectionData() {
return {
...parseHost(ip.value),
user: username.value,
pass: password.value
};
}
function validateConnection() {
if (![ip, username].every(input => input.reportValidity())) return null;
try {
return getConnectionData();
} catch (error) {
showMessage(error.message);
ip.focus();
return null;
}
}
function openResultTab() {
const tab = window.open('about:blank', '_blank');
if (!tab) {
showMessage('Permite deschiderea filei noi în browser.');
return null;
}
try {
const doc = tab.document;
doc.title = 'Conectare la dispozitiv';
const meta = doc.createElement('meta');
meta.name = 'referrer';
meta.content = 'no-referrer';
doc.head.appendChild(meta);
doc.body.style.cssText = 'margin:0;padding:40px;font:16px Arial,sans-serif;color:#222;background:#fff;';
const text = doc.createElement('p');
text.textContent = 'Se conectează la dispozitiv…';
doc.body.appendChild(text);
} catch (_) {}
return tab;
}
function closeResultTab(tab) {
try {
if (tab && !tab.closed) tab.close();
} catch (_) {}
}
function navigateResultTab(tab, url) {
try {
if (!tab || tab.closed) return false;
tab.location.replace(url);
return true;
} catch (_) {
return false;
}
}
function openDevice(operation = 'systemInfo') {
const data = validateConnection();
if (!data) return;
showMessage();
const output = openResultTab();
if (!output) return;
window.dispatchEvent(new CustomEvent('kmw-device-opened', {detail: {tab: output, host: data.host}}));
if (!navigateResultTab(output, commandUrl(data.protocol, data, COMMANDS[operation]))) {
closeResultTab(output);
showMessage('Fila de rezultat a fost închisă sau blocată. Apasă din nou butonul dorit.');
} else if (data.protocol === 'https') {
showMessage('Dacă apare avertizarea de certificat, după ce accepți continuarea conexiunii poate fi necesar să introduci din nou utilizatorul și parola.');
}
}
readButton.addEventListener('click', () => openDevice());
for (const input of [ip, username, password]) {
input.addEventListener('keydown', event => {
if (event.key !== 'Enter' || event.isComposing) return;
event.preventDefault();
openDevice();
});
}
snButton.addEventListener('click', () => openDevice('serialNumber'));
getElement('toggle-password').addEventListener('click', () => {
const show = password.type === 'password';
password.type = show ? 'text' : 'password';
const text = show ? 'Ascunde parola' : 'Arată parola';
getElement('toggle-password').setAttribute('aria-label', text);
getElement('toggle-password').setAttribute('aria-pressed', String(show));
getElement('toggle-password').title = text;
});
for (const input of [ip, username, password]) {
input.addEventListener('input', () => {
showMessage();
});
}
ip.addEventListener('paste', event => {
const text = event.clipboardData && event.clipboardData.getData('text');
if (!text) return;
try {
const label = hostLabel(parseHost(text));
event.preventDefault();
ip.value = label;
showMessage();
} catch (_) {}
});
ip.addEventListener('change', () => {
try {
ip.value = hostLabel(parseHost(ip.value));
} catch (_) {}
});
})();
function readCgiText(value) {
const text = String(value || '').trim();
if (!text || text.length > 65536) return '';
const lines = text.replace(/\r\n?/g, '\n').split('\n').map(line => line.trim()).filter(line => {
return /^[A-Za-z][A-Za-z0-9_.[\]-]*=/.test(line) && !/^(?:password|passwd|pwd|username|authorization|token|cookie|secret)=/i.test(line);
});
if (!lines.some(line => /^(?:updateSerial|serialNumber|sn|deviceType)\s*=/i.test(line))) return '';
return lines.join('\n');
}
function cgiBookmarklet(config, readText) {
const text = readText(document.querySelector('pre')?.innerText || document.body?.innerText);
const localFile = new URL(config.url).protocol === 'file:';
const matchesOrigin = origin => origin === config.origin || (localFile && ['null', 'file://'].includes(origin));
function show(message, error = false) {
let box = document.getElementById('kmw-cgi-transfer-note');
if (!box) {
box = document.createElement('div');
box.id = 'kmw-cgi-transfer-note';
box.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;max-width:400px;padding:14px 18px;border:1px solid #ddd;border-radius:9px;background:white;box-shadow:0 5px 24px #0003;font:14px/1.6 Arial,sans-serif;color:#222;';
box.setAttribute('role', 'status');
document.body.appendChild(box);
}
box.textContent = message;
box.style.color = error ? '#a81724' : '#167446';
return box;
}
if (!text) {
show('Deschide pagina cu rezultatul CGI, apoi apasă marcajul „Preia CGI”.', true);
return;
}
function fallback() {
const target = new URL(config.url);
if (['http:', 'https:'].includes(target.protocol)) {
target.hash = 'kmw-cgi=' + encodeURIComponent(text);
window.location.assign(target.href);
} else {
const box = show('Browserul a izolat fila CGI. Copiază rezultatul și lipește-l în căsuța de căutare.', true);
const field = document.createElement('textarea');
field.value = text;
field.readOnly = true;
field.setAttribute('aria-label', 'Rezultatul CGI pentru copiere');
field.style.cssText = 'display:block;width:100%;height:110px;margin:10px 0;font:12px monospace;';
const button = document.createElement('button');
button.textContent = 'Copiază rezultatul';
button.addEventListener('click', async () => {
let copied = false;
try {
if (window.navigator?.clipboard?.writeText) {
await window.navigator.clipboard.writeText(text);
copied = true;
}
} catch {}
if (!copied) {
field.focus();
field.select();
try { copied = document.execCommand('copy'); } catch {}
}
button.textContent = copied ? 'Copiat — lipește în căutare' : 'Apasă Ctrl+C, apoi lipește în căutare';
});
box.appendChild(field);
box.appendChild(button);
}
}
let target;
try { target = window.opener && !window.opener.closed ? window.opener : null; } catch {}
const requestId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
const origin = localFile ? '*' : config.origin;
let phase = 'waiting';
let timer;
function stop() {
clearTimeout(timer);
window.removeEventListener('message', receive);
}
function expire() { stop(); fallback(); }
function ping() {
phase = 'ping';
try { target.postMessage({type: 'kmw-cgi-ping', requestId}, origin); } catch { phase = 'waiting'; target = null; }
}
function receive(event) {
const data = event.data;
if (!event.source || !matchesOrigin(event.origin) || !data || data.receiverId !== config.receiverId) return;
if (phase === 'waiting' && data.type === 'kmw-cgi-offer') {
target = event.source;
ping();
return;
}
if (event.source !== target || data.requestId !== requestId) return;
if (phase === 'ping' && data.type === 'kmw-cgi-ready') {
phase = 'result';
clearTimeout(timer);
timer = setTimeout(expire, 1800);
target.postMessage({type: 'kmw-cgi-result', requestId, receiverId: config.receiverId, text}, origin);
} else if (phase === 'result' && data.type === 'kmw-cgi-accepted') {
stop();
show('Rezultatul CGI a fost trimis în căutare.');
try { target.focus(); } catch {}
setTimeout(() => {
try { window.close(); } catch {}
setTimeout(() => show('Rezultatul CGI a fost trimis în căutare. Poți închide această filă.'), 300);
}, 500);
}
}
window.addEventListener('message', receive);
<<<<<<< HEAD
timer = setTimeout(expire, target ? 4000 : 1600);
=======
timer = setTimeout(expire, 4000);
>>>>>>> 04d103f7dac25fcfaf0507fbd63446fe23bf7a68
show('Trimit rezultatul CGI…');
if (target) ping();
}
function makeCgiBookmarklet(config) {
const target = new URL(config.url);
if (!['http:', 'https:', 'file:'].includes(target.protocol) || target.username || target.password) throw new Error('Adresă de destinație invalidă.');
const code = `void (${cgiBookmarklet.toString()})(${JSON.stringify(config)},${readCgiText.toString()})`;
return 'javascript:' + encodeURIComponent(code);
}
function createCgiReceiver({receiverId, onResult, now = () => Date.now()}) {
const tabs = new Map();
const pending = new Map();
return {
register(tab, host) {
for (const [source] of tabs) if (source.closed) { tabs.delete(source); pending.delete(source); }
tabs.set(tab, {hostname: new URL('http://' + host).hostname,
origins: [...new Set(['http:', 'https:'].map(protocol => new URL(protocol + '//' + host).origin))]});
},
offer() {
for (const [source, device] of tabs) {
if (source.closed) { tabs.delete(source); pending.delete(source); continue; }
for (const origin of device.origins) {
try { source.postMessage({type: 'kmw-cgi-offer', receiverId}, origin); } catch {}
}
}
return tabs.size;
},
receive(event) {
const data = event.data;
if (!event.source || !tabs.has(event.source) || !data || typeof data !== 'object' || typeof data.requestId !== 'string' || data.requestId.length > 100) return false;
let origin;
try { origin = new URL(event.origin); } catch { return false; }
if (!['http:', 'https:'].includes(origin.protocol) || origin.hostname !== tabs.get(event.source).hostname) return false;
if (data.type === 'kmw-cgi-ping') {
pending.set(event.source, {requestId: data.requestId, at: now()});
event.source.postMessage({type: 'kmw-cgi-ready', requestId: data.requestId, receiverId}, event.origin);
return true;
}
const issued = pending.get(event.source);
if (data.type !== 'kmw-cgi-result' || data.receiverId !== receiverId || issued?.requestId !== data.requestId || now() - issued.at > 15000 || typeof data.text !== 'string') return false;
const text = readCgiText(data.text);
if (!text) return false;
pending.delete(event.source);
onResult(text);
event.source.postMessage({type: 'kmw-cgi-accepted', requestId: data.requestId, receiverId}, event.origin);
return true;
}
};
}
function initializeCgiTransfer({bookmark, status, onResult, win = window}) {
const show = text => { status.textContent = text; status.hidden = !text; };
const storageKey = 'kmw-cgi-receiver-id-v1';
let receiverId;
try { receiverId = win.localStorage.getItem(storageKey); } catch {}
if (!/^[a-z0-9-]{12,100}$/i.test(receiverId || '')) {
receiverId = win.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
try { win.localStorage.setItem(storageKey, receiverId); } catch {}
}
const receiver = createCgiReceiver({receiverId, onResult});
let offerTimer = null;
win.addEventListener('kmw-device-opened', event => {
receiver.register(event.detail.tab, event.detail.host);
receiver.offer();
if (offerTimer === null) offerTimer = win.setInterval(() => {
if (!receiver.offer()) { win.clearInterval(offerTimer); offerTimer = null; }
}, 750);
});
win.addEventListener('pagehide', () => { if (offerTimer !== null) win.clearInterval(offerTimer); });
win.addEventListener('message', event => receiver.receive(event));
try {
const target = new URL(win.location.href);
target.hash = '';
target.username = '';
target.password = '';
bookmark.href = makeCgiBookmarklet({url: target.href, origin: target.origin, receiverId});
} catch {
bookmark.removeAttribute('draggable');
show('Deschide fișierul HTML în browser pentru a salva marcajul.');
}
bookmark.addEventListener('click', event => {
event.preventDefault();
show('Trage „Preia CGI” în bara de marcaje, apoi folosește marcajul în pagina cu rezultatul CGI.');
});
<<<<<<< HEAD
let channel = null;
try { channel = new win.BroadcastChannel('kmw-cgi-relay'); } catch {}
const newId = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
const instanceId = newId();
if (channel) channel.addEventListener('message', ({data}) => {
if (!data || data.type !== 'kmw-cgi-relay' || data.from === instanceId || typeof data.text !== 'string') return;
const text = readCgiText(data.text);
if (!text) return;
channel.postMessage({type: 'kmw-cgi-relayed', id: data.id});
onResult(text);
});
function handOver(text) {
if (!channel) { onResult(text); return; }
const id = newId();
let done = false;
function finish(handed) {
if (done) return;
done = true;
channel.removeEventListener('message', onAck);
if (!handed) { onResult(text); return; }
show('Rezultatul CGI a fost trimis în pagina de căutare deja deschisă.');
try { win.close(); } catch {}
win.setTimeout(() => {
if (win.closed) return;
onResult(text);
show('Rezultatul CGI a fost trimis și în pagina de căutare deja deschisă. Poți închide această filă.');
}, 400);
}
function onAck({data}) {
if (data && data.type === 'kmw-cgi-relayed' && data.id === id) finish(true);
}
channel.addEventListener('message', onAck);
channel.postMessage({type: 'kmw-cgi-relay', id, from: instanceId, text});
win.setTimeout(() => finish(false), 1000);
}
=======
>>>>>>> 04d103f7dac25fcfaf0507fbd63446fe23bf7a68
function receiveFragment() {
const raw = win.location.hash.slice(1);
if (!raw.startsWith('kmw-cgi=') || raw.length > 200000) return;
const text = readCgiText(new URLSearchParams(raw).get('kmw-cgi'));
<<<<<<< HEAD
try { win.history.replaceState(null, '', win.location.href.split('#')[0]); } catch {}
if (text) handOver(text);
=======
if (text) onResult(text);
try { win.history.replaceState(null, '', win.location.href.split('#')[0]); } catch {}
>>>>>>> 04d103f7dac25fcfaf0507fbd63446fe23bf7a68
}
win.addEventListener('hashchange', receiveFragment);
receiveFragment();
return {receiver, receiverId};
}
initializeCgiTransfer({
bookmark: document.getElementById('cgi-bookmark'),
status: document.getElementById('bookmark-message'),
onResult(text) {
window.fwcCgiResult = text;
window.dispatchEvent(new CustomEvent('kmw-cgi-result', {detail: {text}}));
}
});
})();
(function fwcInit() {
'use strict';
if (!document.getElementById('edit-dialog')) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fwcInit); return; }
const fields = [
['model', 'Model'], ['category', 'Categorie'], ['series', 'Serie'],
['package', 'Pachet'], ['packageOrder', 'OrdinePachet'], ['filename', 'Fisier'],
['url', 'URL'], ['folder', 'Folder'], ['source', 'Sursa'],
['sourceRow', 'RandSursa'], ['note', 'Note'], ['sourceModel', 'ModelSursa'],
['sourceKind', 'TipSursa'], ['restriction', 'Restrictii']
];
const categories = ['NVR', 'HDCVI', 'HCVR & DVR', 'IPC', 'ITC'];
function isModel(value) {
return /^(?:(?:NVR|HCVR|IHCVR|XVR|DVR|ITC|PSDW|HDW|HDBW|HDB|HFW|HF|HD|KW|K)\d|(?:EZ-)?IPC-[A-Z0-9])[0-9A-Z_./()+-]*$/.test(value);
}
function normalizeModel(value) {
return String(value || '').trim().replace(/^["']|["']$/g, '')
.replace(/[‐‑‒–—−]/g, '-').replace(/\s+/g, '').toUpperCase().replace(/^(?:DHI|DH)[-_]/, '');
}
function extractModel(text) {
const match = String(text).match(/(?:^|[\r\n\\])\s*updateSerial\s*=\s*([^\r\n\\]+)/i);
const value = normalizeModel(match ? match[1] : text);
return value.length <= 160 && (isModel(value) || /^(?:NVR|HCVR|XVR|DVR|ITC)-\d[0-9A-Z_./()+-]*$/.test(value)) ? value : '';
}
function manualModelQuery(text) {
const raw = String(text || '').trim();
if (raw.length > 160 || /[=\r\n\\]/.test(raw)) return '';
const model = normalizeModel(raw);
return /^[A-Z0-9_./()+-]+$/.test(model) && model.replace(/[^A-Z0-9]/g, '').length >= 3 ? model : '';
}
function safeUrl(value) {
if (!String(value || '').trim()) return '';
const url = new URL(String(value).trim());
if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Linkul trebuie să fie HTTP sau HTTPS, fără date de autentificare.');
return url.href;
}
function cleanRecord(raw, index = 0) {
if (!raw || typeof raw !== 'object') throw new Error('Corespondență invalidă la rândul ' + (index + 1));
const model = normalizeModel(raw.model);
if (!isModel(model)) throw new Error('Model invalid: ' + (raw.model || '(gol)'));
const inferred = /^(?:EZ-)?IPC-|^(?:PSDW|HDW|HDBW|HDB|HFW|HF|HD|KW|K)\d/.test(model) ? 'IPC' : model.startsWith('ITC') ? 'ITC' : model.startsWith('NVR') ? 'NVR' : 'HDCVI';
const category = String(raw.category || inferred).toUpperCase();
if (!categories.includes(category)) throw new Error('Categorie invalidă: ' + category);
const text = key => String(raw[key] || '').trim();
return {
id: String(raw.id || 'import-' + index), model, category,
series: text('series'), package: text('package'),
packageOrder: Number.isFinite(Number(raw.packageOrder)) ? Math.max(1, Math.trunc(Number(raw.packageOrder))) : 1,
filename: text('filename'), url: safeUrl(raw.url), folder: safeUrl(raw.folder),
source: safeUrl(raw.source), sourceRow: Math.max(0, Number(raw.sourceRow) || 0),
method: text('method') || 'manual', note: text('note'),
sourceModel: text('sourceModel'), sourceKind: text('sourceKind') || (text('source').toLowerCase().endsWith('.txt') ? 'txt' : 'excel'),
restriction: text('restriction')
};
}
function findFirmware(text, records) {
const model = extractModel(text);
return {model, matches: model ? records.filter(record => normalizeModel(record.model) === model) : []};
}
function findInDatabases(text, primary, secondary) {
const first = findFirmware(text, primary);
if (first.matches.some(record => record.url)) return {...first, database: 'primary', checked: ['primary']};
const second = findFirmware(text, secondary);
if (second.matches.length) return {...second, database: 'viatec', checked: ['primary', 'viatec']};
return {...first, database: first.matches.length ? 'primary' : null, checked: ['primary', 'viatec']};
}
function editDistance(left, right) {
const previous = Array.from({length: right.length + 1}, (_, index) => index);
for (let i = 1; i <= left.length; i++) {
const row = [i];
for (let j = 1; j <= right.length; j++) {
row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
}
previous.splice(0, previous.length, ...row);
}
return previous[right.length];
}
function nearestModels(text, primary, secondary, {manual = false, limit = manual ? Infinity : 6} = {}) {
const model = manual ? manualModelQuery(text) : extractModel(text);
if (!model || model.length < (manual ? 3 : 5)) return [];
const compact = value => value.replace(/[^A-Z0-9]/g, '');
const family = value => value.match(/^(?:EZ-)?IPC|^[A-Z]+/)?.[0] || '';
const query = compact(model);
const queryFamily = family(model);
const filterFamily = !manual || /^(?:IPC|EZ-IPC|NVR|HCVR|IHCVR|XVR|DVR|ITC|PSDW|HDW|HDBW|HDB|HFW|HF|HD|KW|K)$/.test(queryFamily);
const seen = new Set();
const candidates = [];
for (const record of [...primary, ...secondary]) {
const name = normalizeModel(record.model);
if (!record.url || (!manual && name === model) || seen.has(name) || (filterFamily && family(name) !== queryFamily)) continue;
seen.add(name);
const target = compact(name);
let score;
if (manual && name === model) score = 2;
else if (manual && target.includes(query)) score = 1.1 + query.length / target.length * 0.2 + (target.startsWith(query) ? 0.1 : 0);
else if (manual && (!filterFamily || query.length < 5)) continue;
else score = query === target ? 1 : target.startsWith(query) && query.length >= 6 ? 0.76 + query.length / target.length * 0.1 : 1 - editDistance(query, target) / Math.max(query.length, target.length);
if (score < 0.64) continue;
let prefix = 0;
while (query[prefix] && query[prefix] === target[prefix]) prefix++;
candidates.push({model: name, score: score + prefix / Math.max(query.length, target.length) * 0.08});
}
return candidates.sort((a, b) => b.score - a.score || a.model.localeCompare(b.model)).slice(0, limit);
}
function uniqueFiles(records) {
const seen = new Set();
return records.filter(record => {
const key = record.url || record.package + ':' + record.sourceRow;
if (seen.has(key)) return false;
seen.add(key);
return true;
});
}
function whatsappUrl(text, model) {
const intro = model ? `Solicitare firmware pentru modelul ${model}.` : 'Solicitare suport firmware.';
return 'whatsapp://send?text=' + encodeURIComponent(intro + (text.trim() ? '\n\nModel / rezultat CGI:\n' + text.trim() : ''));
}
function parseCsv(text) {
text = text.replace(/^\uFEFF/, '');
const first = text.split(/\r?\n/)[0];
const separator = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
const rows = [];
let row = [], cell = '', quoted = false;
for (let i = 0; i < text.length; i++) {
const char = text[i];
if (char === '"') {
if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
else quoted = !quoted;
} else if (char === separator && !quoted) {
row.push(cell); cell = '';
} else if ((char === '\n' || char === '\r') && !quoted) {
if (char === '\r' && text[i + 1] === '\n') i++;
row.push(cell); rows.push(row); row = []; cell = '';
} else cell += char;
}
if (quoted) throw new Error('Fișierul CSV are ghilimele neînchise.');
if (cell || row.length) { row.push(cell); rows.push(row); }
const key = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const mapping = new Map(fields.flatMap(([name, label]) => [[key(name), name], [key(label), name]]));
const headerAt = rows.findIndex(values => values.some(value => key(value) === 'model') && values.some(value => key(value) === 'url'));
if (headerAt < 0) throw new Error('CSV-ul trebuie să conțină coloanele Model și URL.');
const header = rows[headerAt].map(value => mapping.get(key(value)));
return rows.slice(headerAt + 1).filter(values => values.some(value => value.trim())).map((values, index) => {
const raw = {};
header.forEach((name, i) => { if (name) raw[name] = (values[i] || '').replace(/^'(?=[=+@-])/, ''); });
return cleanRecord(raw, index);
});
}
function exportCsv(records) {
const quote = value => '"' + String(value ?? '').replace(/^[=+@-]/, char => "'" + char).replaceAll('"', '""') + '"';
return '\uFEFF' + [fields.map(([, label]) => label), ...records.map(record => fields.map(([name]) => record[name]))]
.map(values => values.map(quote).join(',')).join('\r\n');
}
function importDatabase(text, extension) {
const data = extension === 'csv' ? parseCsv(text) : JSON.parse(text);
const rows = Array.isArray(data) ? data : data?.records;
if (!Array.isArray(rows) || rows.length > 20000) throw new Error('Baza de date nu are o listă validă de corespondențe.');
const ids = new Set();
return rows.map((raw, index) => {
const record = cleanRecord(raw, index);
while (ids.has(record.id)) record.id += '-' + index;
ids.add(record.id);
return record;
});
}
function splitList(meta, records, maxBytes) {
const encoder = new TextEncoder();
const sizes = records.map(record => encoder.encode(JSON.stringify(record)).length + 1);
const total = sizes.reduce((sum, size) => sum + size, 0);
const count = Math.max(1, Math.ceil(total / maxBytes));
const target = total / count;
const chunks = [[]];
let current = 0;
records.forEach((record, index) => {
if (current + sizes[index] > target && chunks[chunks.length - 1].length && chunks.length < count) {
chunks.push([]);
current = 0;
}
chunks[chunks.length - 1].push(record);
current += sizes[index];
});
return chunks.map((chunk, index) => index === 0
? {...meta, part: 1, parts: chunks.length, records: chunk}
: {schemaVersion: meta.schemaVersion, updated: meta.updated, part: index + 1, parts: chunks.length, records: chunk});
}
const $ = id => document.getElementById(id);
const EDITOR_PARAM = 'editare';
const editorMode = new URLSearchParams(window.location.search).has(EDITOR_PARAM);
const DATA_URLS = {
primary: [
'https://gist.githubusercontent.com/GabiApc/48f52bfe37ee90bf65d6428f84240f90/raw/Baza_Firmware_KMW_1.json'
],
viatec: [
'https://gist.githubusercontent.com/GabiApc/1c5c9189aba48336203b93f5b6d0b58d/raw/Baza_Firmware_Viatec_1.json',
'https://gist.githubusercontent.com/GabiApc/b9ebae0d6b33c60ec61b8f47d07702dc/raw/Baza_Firmware_Viatec_2.json',
'https://gist.githubusercontent.com/GabiApc/49b7bf0e0ff0fa18c6c7a5920af092f9/raw/Baza_Firmware_Viatec_3.json',
'https://gist.githubusercontent.com/GabiApc/a85e74419a83c6e69cb20aeb21497dfd/raw/Baza_Firmware_Viatec_4.json',
'https://gist.githubusercontent.com/GabiApc/8605c81dd295264bc12a1c2bdc529214/raw/Baza_Firmware_Viatec_5.json'
]
};
const DATA_FILES = {primary: 'Baza_Firmware_KMW', viatec: 'Baza_Firmware_Viatec'};
let listWarnings = [];
const PART_MAX_BYTES = 800 * 1024;
const downloadIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 12H4V17H20V12H22V17C22 18.11 21.11 19 20 19H4C2.9 19 2 18.11 2 17V12M12 15L17.55 9.54L16.13 8.13L13 11.25V2H11V11.25L7.88 8.13L6.46 9.55L12 15Z"/></svg>';
let originals = {primary: {records: []}, viatec: {records: []}};
const storageKeys = {primary: 'kmw-firmware-db-v1', viatec: 'kmw-firmware-viatec-db-v1'};
const names = {primary: 'Lista 1', viatec: 'Lista 2'};
let databaseRows = {primary: [], viatec: []};
const pageSize = 20;
let page = 0;
let editingId = null;
let editingDatabase = 'primary';
const selectedDatabase = () => $('database-select').value;
const currentRecords = () => databaseRows[selectedDatabase()];
function message(text, error = false) {
$('database-message').textContent = text;
$('database-message').classList.toggle('is-error', error);
}
const serverHashes = {};
const staleDrafts = {};
function listHash(records) {
const text = JSON.stringify(records);
let hash = 2166136261;
for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
return (hash >>> 0).toString(36) + '-' + records.length;
}
function renderDraftNotice() {
const key = selectedDatabase();
const draft = staleDrafts[key];
$('draft-notice').hidden = !draft;
if (!draft) return;
const date = new Date(draft.saved);
const when = draft.saved && !isNaN(date) ? ' din ' + date.toLocaleString('ro-RO', {dateStyle: 'short', timeStyle: 'short'}) : '';
$('draft-text').textContent = names[key] + ': ai modificări locale' + when + ', făcute pe o versiune mai veche a listei. Lista de pe server s-a schimbat între timp, așa că acum vezi lista de pe server. Dacă folosești modificările tale, schimbările făcute între timp pe server se pierd la următorul export.';
}
function dropDraft(key) {
try { localStorage.removeItem(storageKeys[key]); } catch {}
delete staleDrafts[key];
renderDraftNotice();
}
function staleDraftKept(key) {
if (!staleDrafts[key]) return false;
if (!confirm(names[key] + ': modificările tale locale vechi se vor șterge. Continui?')) return true;
dropDraft(key);
return false;
}
function loadSaved() {
for (const key of Object.keys(storageKeys)) {
serverHashes[key] = listHash(databaseRows[key]);
let draft;
try {
const saved = localStorage.getItem(storageKeys[key]);
if (!saved) continue;
draft = {...JSON.parse(saved), records: importDatabase(saved, 'json')};
} catch {
message('Modificările locale din ' + names[key] + ' nu au putut fi încărcate. Se folosește lista de pe server.', true);
continue;
}
if (listHash(draft.records) === serverHashes[key]) dropDraft(key);
else if (draft.base === serverHashes[key]) databaseRows[key] = draft.records;
else staleDrafts[key] = draft;
}
const stale = Object.keys(staleDrafts);
if (stale.length && !staleDrafts[selectedDatabase()]) $('database-select').value = stale[0];
renderDraftNotice();
}
function save(key = selectedDatabase()) {
try {
localStorage.setItem(storageKeys[key], JSON.stringify({schemaVersion: 1, base: serverHashes[key], saved: new Date().toISOString(), records: databaseRows[key]}));
message('Tabelul ' + names[key] + ' a fost salvat în acest browser.');
} catch {
message('Browserul nu permite salvarea locală. Exportă JSON pentru a păstra modificările.', true);
}
renderTable();
if (!$('search-result').hidden) search();
}
function element(tag, text, className) {
const node = document.createElement(tag);
if (text !== undefined) node.textContent = text;
if (className) node.className = className;
return node;
}
function link(text, href, className) {
const anchor = element('a', text, className);
anchor.href = href;
anchor.target = '_blank';
anchor.rel = 'noopener noreferrer';
return anchor;
}
function updateWhatsApp() {
const text = $('cgi-text').value.trim();
$('share-whatsapp').href = whatsappUrl(text, extractModel(text));
}
function search(selectedModel = '') {
const text = $('cgi-text').value.trim();
const manual = Boolean(manualModelQuery(text));
const {model, matches} = findInDatabases(selectedModel || text, databaseRows.primary, databaseRows.viatec);
const suggestions = manual ? nearestModels(text, databaseRows.primary, databaseRows.viatec, {manual: true}) : !matches.length ? nearestModels(text, databaseRows.primary, databaseRows.viatec) : [];
const files = uniqueFiles(matches).sort((a, b) => a.packageOrder - b.packageOrder || a.filename.localeCompare(b.filename));
const available = files.filter(record => record.url);
$('search-result').hidden = false;
$('firmware-links').replaceChildren();
$('suggestions').replaceChildren();
$('suggestions-title').hidden = !suggestions.length;
$('found-model').textContent = model;
$('found-model').hidden = !model;
updateWhatsApp();
$('search-status').classList.toggle('is-error', !available.length && !suggestions.length);
$('search-status').classList.toggle('is-success', available.length > 0);
if (!text) {
$('search-status').textContent = 'Lipește rezultatul CGI sau introdu modelul.';
return;
}
if (!model) {
$('search-status').textContent = manual ? suggestions.length ? 'Alege un model pentru a vedea fișierele.' : 'Nu am găsit modele apropiate. Îl poți trimite pe WhatsApp.' : 'Nu am identificat modelul. Introdu cel puțin 3 caractere sau verifică linia updateSerial.';
} else if (!matches.length) {
$('search-status').textContent = suggestions.length ? 'Nu am găsit modelul exact. Modele apropiate:' : 'Nu am găsit modelul. Îl poți trimite pe WhatsApp.';
} else if (!available.length) {
$('search-status').textContent = 'Nu există un fișier pentru acest model. Îl poți trimite pe WhatsApp.';
} else {
$('search-status').textContent = selectedModel ? 'Fișiere pentru modelul selectat. Verifică potrivirea cu dispozitivul.' : available.length > 1 ? 'Fișiere disponibile.' : 'Firmware găsit.';
}
$('suggestions-title').textContent = 'Modele găsite: ' + suggestions.length;
for (const suggestion of suggestions) {
const button = element('button', suggestion.model, 'fwc-sugg');
button.type = 'button';
button.setAttribute('aria-label', 'Vezi fișierele pentru ' + suggestion.model);
button.setAttribute('aria-pressed', String(suggestion.model === model));
button.addEventListener('click', () => search(suggestion.model));
$('suggestions').append(button);
}
for (const record of files) {
const card = element('article', undefined, 'fwc-file');
const body = element('div', undefined, 'fwc-file-body');
body.append(element('h3', record.filename || record.package || 'Fără fișier asociat', 'fwc-file-name'));
const meta = element('p', undefined, 'fwc-file-meta');
if (record.series) meta.append(element('span', 'Seria ' + record.series));
if (record.folder) meta.append(link('Alte versiuni ↗', record.folder, 'fwc-link'));
if (meta.childElementCount) body.append(meta);
card.append(body);
if (record.url) {
const download = link('Descarcă', record.url, 'fwc-btn fwc-btn-primary');
download.insertAdjacentHTML('afterbegin', downloadIcon);
card.append(download);
}
if (record.restriction) card.append(element('p', record.restriction, 'fwc-restriction'));
$('firmware-links').append(card);
}
}
function filteredRecords() {
const query = $('table-filter').value.trim().toUpperCase();
const category = $('category-filter').value;
return currentRecords().filter(record => (!category || record.category === category) &&
[record.model, record.series, record.filename, record.package].some(value => value.toUpperCase().includes(query)));
}
function renderTable() {
const rows = filteredRecords();
const pages = Math.max(1, Math.ceil(rows.length / pageSize));
page = Math.min(page, pages - 1);
$('database-body').replaceChildren();
for (const record of rows.slice(page * pageSize, (page + 1) * pageSize)) {
const row = element('tr');
for (const value of [record.model, record.category, record.series, record.filename || record.package]) row.append(element('td', value));
const urlCell = element('td');
if (record.url) urlCell.append(link('Fișier ↗', record.url, 'fwc-link'));
else urlCell.textContent = '—';
row.append(urlCell);
const editCell = element('td');
const edit = element('button', 'Editează', 'fwc-btn');
edit.type = 'button';
edit.setAttribute('aria-label', 'Editează ' + record.model + ' ' + record.filename);
edit.addEventListener('click', () => openEditor(record));
editCell.append(edit);
row.append(editCell);
$('database-body').append(row);
}
if (!rows.length) {
const row = element('tr');
const cell = element('td', 'Nicio corespondență.');
cell.colSpan = 6;
row.append(cell);
$('database-body').append(row);
}
$('page-label').textContent = rows.length + ' corespondențe · pagina ' + (page + 1) + ' / ' + pages;
$('previous-page').disabled = page === 0;
$('next-page').disabled = page + 1 >= pages;
}
function openEditor(record = null) {
if (staleDraftKept(selectedDatabase())) return;
editingId = record?.id || null;
editingDatabase = selectedDatabase();
$('edit-title').textContent = record ? 'Editează corespondența' : 'Adaugă o corespondență';
$('edit-category').replaceChildren(...categories.map(category => new Option(category, category)));
for (const name of ['model', 'category', 'series', 'filename', 'url', 'package', 'note', 'source', 'restriction']) {
$('edit-' + name).value = record?.[name] || (name === 'category' ? 'NVR' : '');
}
$('edit-source-model').value = record?.sourceModel || '';
$('edit-order').value = record?.packageOrder || 1;
$('delete-record').hidden = !record;
$('editor-message').hidden = true;
$('edit-dialog').showModal();
}
function newId() {
return 'manual-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}
function download(name, text, type) {
const url = URL.createObjectURL(new Blob([text], {type}));
const anchor = element('a');
anchor.href = url;
anchor.download = name;
document.body.append(anchor);
anchor.click();
anchor.remove();
setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function fetchJson(url) {
const response = await fetch(url, {cache: 'no-cache', credentials: 'omit'});
if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + url);
const data = await response.json();
if (!Array.isArray(data?.records)) throw new Error('Format invalid: ' + url);
return data;
}
async function fetchList(key) {
const items = (await Promise.all(DATA_URLS[key].map(fetchJson))).sort((a, b) => (a.part || 0) - (b.part || 0));
const expected = Math.trunc(Number(items[0].parts)) || items.length;
if (expected !== items.length) {
listWarnings.push(names[key] + ' are ' + expected + ' părți, dar pagina are linkuri pentru ' + items.length + '. Actualizează DATA_URLS.');
}
const {part, parts, records, ...meta} = items[0];
return {...meta, records: items.flatMap(item => item.records)};
}
async function fetchLists() {
listWarnings = [];
const entries = await Promise.all(Object.keys(DATA_URLS).map(async key => [key, await fetchList(key)]));
if (listWarnings.length) console.warn(listWarnings.join(' '));
originals = Object.fromEntries(entries);
databaseRows = Object.fromEntries(entries.map(([key, data]) => [key, data.records.flatMap((raw, index) => {
try { return [cleanRecord(raw, index)]; } catch { return []; }
})]));
}
const searchButton = document.getElementById('search-button');
const searchLabel = searchButton.textContent;
let listsReady = null;
function loadLists() {
searchButton.disabled = true;
searchButton.textContent = 'Se încarcă lista de modele…';
listsReady = fetchLists().then(() => true, () => false).then(ok => {
searchButton.disabled = false;
searchButton.textContent = searchLabel;
if (ok && editorMode) {
loadSaved();
renderTable();
if (listWarnings.length) message(listWarnings.join(' '), true);
$('database-section').hidden = false;
}
return ok;
});
return listsReady;
}
function showLoadError() {
$('search-result').hidden = false;
$('firmware-links').replaceChildren();
$('suggestions').replaceChildren();
$('suggestions-title').hidden = true;
$('found-model').hidden = true;
$('search-status').className = 'fwc-status is-error';
$('search-status').textContent = 'Lista de modele nu a putut fi încărcată. Încearcă din nou sau trimite-ne modelul pe WhatsApp.';
}
async function searchWhenReady() {
if (!(await listsReady) && !(await loadLists())) {
showLoadError();
return;
}
search();
}
searchButton.addEventListener('click', () => searchWhenReady());
$('cgi-text').addEventListener('input', () => {
$('search-result').hidden = true;
updateWhatsApp();
});
for (const id of ['table-filter', 'category-filter']) $(id).addEventListener('input', () => { page = 0; renderTable(); });
$('database-select').addEventListener('change', () => { page = 0; $('category-filter').value = ''; message(''); renderTable(); renderDraftNotice(); });
$('draft-use').addEventListener('click', () => {
const key = selectedDatabase();
databaseRows[key] = staleDrafts[key].records;
delete staleDrafts[key];
renderDraftNotice();
page = 0;
save(key);
});
$('draft-drop').addEventListener('click', () => {
dropDraft(selectedDatabase());
message('Modificările locale vechi au fost șterse.');
});
$('previous-page').addEventListener('click', () => { page--; renderTable(); });
$('next-page').addEventListener('click', () => { page++; renderTable(); });
$('add-record').addEventListener('click', () => openEditor());
$('close-editor').addEventListener('click', () => $('edit-dialog').close());
function saveRecord() {
if (!$('edit-model').reportValidity()) return;
try {
const rows = databaseRows[editingDatabase];
const previous = rows.find(record => record.id === editingId) || {};
const values = Object.fromEntries(['model', 'category', 'series', 'filename', 'url', 'package', 'note', 'source', 'restriction'].map(name => [name, $('edit-' + name).value]));
const record = cleanRecord({...previous, ...values, sourceModel: $('edit-source-model').value, id: editingId || newId(), packageOrder: $('edit-order').value, method: 'manual'});
if (!record.filename && record.url) record.filename = decodeURIComponent(new URL(record.url).pathname.split('/').pop());
const index = rows.findIndex(item => item.id === editingId);
if (index < 0) rows.push(record);
else rows[index] = record;
save(editingDatabase);
$('edit-dialog').close();
} catch (error) {
$('editor-message').textContent = error.message;
$('editor-message').hidden = false;
}
}
$('save-record').addEventListener('click', saveRecord);
$('edit-dialog').addEventListener('keydown', event => {
if (event.key !== 'Enter' || event.isComposing || event.target.tagName !== 'INPUT') return;
event.preventDefault();
saveRecord();
});
$('delete-record').addEventListener('click', () => {
databaseRows[editingDatabase] = databaseRows[editingDatabase].filter(record => record.id !== editingId);
save(editingDatabase);
$('edit-dialog').close();
});
$('export-json').addEventListener('click', () => {
const key = selectedDatabase();
const {records, ...meta} = originals[key];
const parts = splitList({...meta, updated: new Date().toISOString().slice(0, 10), stats: undefined, conflicts: undefined}, currentRecords(), PART_MAX_BYTES);
parts.forEach((part, index) => setTimeout(() => download(DATA_FILES[key] + '_' + (index + 1) + '.json', JSON.stringify(part), 'application/json'), index * 400));
const extra = parts.length !== DATA_URLS[key].length
? ' Atenție: pagina are linkuri pentru ' + DATA_URLS[key].length + ' părți; actualizează DATA_URLS.'
: '';
message((parts.length > 1
? names[key] + ' a fost exportată în ' + parts.length + ' fișiere (' + DATA_FILES[key] + '_1 … _' + parts.length + '.json). Urcă fiecare fișier în gist-ul lui.'
: names[key] + ' a fost exportată în ' + DATA_FILES[key] + '_1.json.') + extra, Boolean(extra));
});
$('export-csv').addEventListener('click', () => download('Baza_Firmware_' + (selectedDatabase() === 'primary' ? 'KMW' : 'Viatec') + '.csv', exportCsv(currentRecords()), 'text/csv;charset=utf-8'));
$('import-button').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async event => {
const files = [...event.target.files];
if (!files.length) return;
const targetDatabase = selectedDatabase();
if (staleDraftKept(targetDatabase)) { event.target.value = ''; return; }
try {
if (files.some(file => file.size > 10 * 1024 * 1024)) throw new Error('Fișier prea mare. Limita este 10 MB.');
const extensions = [...new Set(files.map(file => file.name.split('.').pop().toLowerCase()))];
if (extensions.length !== 1 || !['csv', 'json'].includes(extensions[0])) throw new Error('Alege fișierele JSON ale listei sau un fișier CSV.');
let imported;
if (extensions[0] === 'csv') {
if (files.length > 1) throw new Error('Alege un singur fișier CSV.');
imported = importDatabase(await files[0].text(), 'csv');
} else {
const items = await Promise.all(files.map(async file => JSON.parse(await file.text())));
const expected = items.find(item => item?.parts)?.parts;
if (expected && (items.length !== expected || new Set(items.map(item => item.part)).size !== expected)) {
throw new Error('Lista are ' + expected + ' părți. Selectează toate fișierele ei odată.');
}
items.sort((a, b) => (a?.part || 0) - (b?.part || 0));
const rows = items.flatMap(item => Array.isArray(item) ? item : Array.isArray(item?.records) ? item.records : []);
imported = importDatabase(JSON.stringify({records: rows}), 'json');
}
databaseRows[targetDatabase] = imported;
page = 0;
save(targetDatabase);
} catch (error) {
message('Import nereușit: ' + error.message, true);
}
event.target.value = '';
});
if (editorMode) $('category-filter').replaceChildren(new Option('Toate categoriile', ''), ...categories.map(category => new Option(category, category)));
loadLists();
updateWhatsApp();
function receiveCgi(text) {
$('cgi-text').value = text;
$('search-result').hidden = true;
updateWhatsApp();
$('bookmark-message').textContent = 'Rezultatul CGI a fost preluat.';
$('bookmark-message').hidden = false;
if (extractModel(text)) searchWhenReady();
$('cgi-text').focus();
}
window.addEventListener('kmw-cgi-result', event => receiveCgi(event.detail.text));
if (window.fwcCgiResult) receiveCgi(window.fwcCgiResult);
})();
