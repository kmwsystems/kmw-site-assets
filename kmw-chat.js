/*!
 * kmw-chat.js — Widget chatbot flotant pentru site-ul KMW

 */
(function () {
  'use strict';

  // Nu porni de două ori (dacă scriptul e inclus accidental de mai multe ori)
  if (window.__kmwChatLoaded) return;
  window.__kmwChatLoaded = true;

  // ------------------------------------------------------------------
  // 1) CONFIG (poate fi suprascris prin window.KMW_CHAT_CONFIG)
  // ------------------------------------------------------------------
  var CFG = Object.assign({
    title: 'Asistent KMW',
    subtitle: 'De obicei răspundem în câteva minute',
    greeting: 'Bună! 👋 Sunt asistentul KMW. Cu ce te pot ajuta azi? Poți întreba despre livrare, retur, produse sau contact.',
    placeholder: 'Scrie un mesaj…',
    position: 'right',       // 'right' sau 'left'
    accent: '#ed1c24',       // roșu brand KMW
    accentDark: '#c81720',   // hover
    dark: '#222222',         // header / bule bot
    whatsapp: '',            // ex: '40712345678' -> arată buton WhatsApp la fallback
    contactUrl: '/contact.html'
  }, window.KMW_CHAT_CONFIG || {});

  // ------------------------------------------------------------------
  // 2) MOTOR DE RĂSPUNS (reguli simple / FAQ) — editabil ușor
  //    Fiecare regulă: cuvinte-cheie -> răspuns. Prima potrivire câștigă.
  //    Diacriticele sunt normalizate, deci „livrare" = „livrări".
  // ------------------------------------------------------------------
  var RULES = [
    {
      keys: ['livrare', 'livrari', 'transport', 'curier', 'cat dureaza', 'expediere'],
      reply: 'Livrarea se face prin curier rapid, de obicei în 1–3 zile lucrătoare. Costul apare automat în coș, în funcție de greutate și localitate.'
    },
    {
      keys: ['retur', 'returnare', 'inapoi', 'garantie', 'garantia'],
      reply: 'Ai drept de retur în 14 zile calendaristice de la primire. Produsele cu defect beneficiază de garanție conform legii — scrie-ne datele comenzii și te ajutăm cu procesul.'
    },
    {
      keys: ['plata', 'plati', 'card', 'ramburs', 'factura', 'facturare'],
      reply: 'Poți plăti cu cardul online sau ramburs la livrare. Factura se emite automat și o primești pe email după confirmarea comenzii.'
    },
    {
      keys: ['stoc', 'disponibil', 'disponibilitate', 'am pe stoc'],
      reply: 'Disponibilitatea fiecărui produs e afișată pe pagina lui. Dacă un produs e „la comandă", scrie-ne modelul și verificăm termenul exact pentru tine.'
    },
    {
      keys: ['pret', 'preturi', 'cost', 'oferta', 'reducere', 'discount'],
      reply: 'Prețurile afișate sunt fără TVA (se adaugă la finalizare). Pentru comenzi mari sau oferte personalizate, spune-ne produsele și cantitatea.'
    },
    {
      keys: ['contact', 'telefon', 'email', 'program', 'vorbesc cu cineva', 'operator', 'om'],
      reply: '__CONTACT__' // marcaj special: afișează butoanele de contact
    },
    {
      keys: ['salut', 'buna', 'hey', 'noroc', 'ziua'],
      reply: 'Salut! 😊 Spune-mi cu ce te pot ajuta — livrare, retur, plată, stoc sau contact.'
    },
    {
      keys: ['multumesc', 'mersi', 'multam'],
      reply: 'Cu drag! Dacă mai ai întrebări, sunt aici. 🙌'
    }
  ];

  var FALLBACK = 'Momentan nu am un răspuns automat pentru asta. Te pot pune în legătură cu un coleg — vezi opțiunile de contact mai jos.';

  function normalize(s) {
    return (s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // scoate diacriticele
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ------------------------------------------------------------------
  // PUNCT DE INTEGRARE BACKEND
  // Înlocuiește corpul acestei funcții cu un fetch() către endpointul tău.
  // Trebuie să returneze o Promise care se rezolvă cu un string (răspunsul).
  //
  // Exemplu backend real:
  //   function getBotReply(text, history) {
  //     return fetch('/api/chat', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ message: text, history: history })
  //     }).then(function (r) { return r.json(); })
  //       .then(function (d) { return d.reply; });
  //   }
  // ------------------------------------------------------------------
  function getBotReply(text) {
    var n = normalize(text);
    for (var i = 0; i < RULES.length; i++) {
      var rule = RULES[i];
      for (var j = 0; j < rule.keys.length; j++) {
        if (n.indexOf(normalize(rule.keys[j])) !== -1) {
          return Promise.resolve(rule.reply);
        }
      }
    }
    return Promise.resolve(FALLBACK);
  }

  // ------------------------------------------------------------------
  // 3) STILURI (în Shadow DOM — izolate). Folosesc variabile CSS din CFG.
  // ------------------------------------------------------------------
  var side = CFG.position === 'left' ? 'left' : 'right';
  var CSS = [
    ':host{ all: initial; }',
    '*{ box-sizing: border-box; font-family: "Open Sans", Helvetica, Arial, sans-serif; }',
    '.kmw-root{',
    '  --accent:' + CFG.accent + '; --accent-dark:' + CFG.accentDark + ';',
    '  --dark:' + CFG.dark + '; --bg:#ffffff; --bot-bg:#f4f4f4; --line:#e8e8e8;',
    '  position: fixed; ' + side + ': 20px; bottom: 20px; z-index: 2147483000;',
    '}',
    // Butonul flotant (bula)
    '.kmw-fab{',
    '  width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer;',
    '  background: var(--accent); color: #fff; display: flex; align-items: center;',
    '  justify-content: center; box-shadow: 0 6px 20px rgba(0,0,0,.25);',
    '  transition: transform .2s ease, background .2s ease;',
    '}',
    '.kmw-fab:hover{ background: var(--accent-dark); transform: translateY(-2px); }',
    '.kmw-fab svg{ width: 28px; height: 28px; fill: #fff; }',
    '.kmw-fab .kmw-badge{',
    '  position: absolute; top: -4px; ' + side + ': -4px; background: #09bf40; color:#fff;',
    '  width: 18px; height: 18px; border-radius: 50%; font-size: 11px; font-weight: 700;',
    '  display: flex; align-items: center; justify-content: center;',
    '}',
    // Panoul
    '.kmw-panel{',
    '  position: absolute; ' + side + ': 0; bottom: 76px; width: 360px; max-width: calc(100vw - 40px);',
    '  height: 520px; max-height: calc(100vh - 120px); background: var(--bg);',
    '  border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,.28); overflow: hidden;',
    '  display: flex; flex-direction: column; transform-origin: bottom ' + side + ';',
    '  opacity: 0; transform: scale(.85) translateY(10px); pointer-events: none;',
    '  transition: opacity .18s ease, transform .18s ease;',
    '}',
    '.kmw-root.open .kmw-panel{ opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; }',
    // Header
    '.kmw-head{ background: var(--dark); color: #fff; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }',
    '.kmw-head .kmw-ava{ width: 40px; height: 40px; border-radius: 50%; background: var(--accent); display:flex; align-items:center; justify-content:center; flex: 0 0 auto; }',
    '.kmw-head .kmw-ava svg{ width: 22px; height: 22px; fill:#fff; }',
    '.kmw-head .kmw-t{ font-size: 15px; font-weight: 700; line-height: 1.2; }',
    '.kmw-head .kmw-s{ font-size: 12px; opacity: .8; margin-top: 2px; }',
    '.kmw-head .kmw-close{ margin-' + (side === 'right' ? 'left' : 'right') + ': auto; background: none; border: none; color:#fff; cursor: pointer; font-size: 22px; line-height: 1; opacity:.8; }',
    '.kmw-head .kmw-close:hover{ opacity: 1; }',
    // Corp mesaje
    '.kmw-body{ flex: 1; overflow-y: auto; padding: 16px; background: #fafafa; }',
    '.kmw-msg{ margin-bottom: 12px; display: flex; }',
    '.kmw-msg.bot{ justify-content: flex-start; }',
    '.kmw-msg.user{ justify-content: flex-end; }',
    '.kmw-bubble{ max-width: 80%; padding: 10px 14px; font-size: 14px; line-height: 1.5; border-radius: 14px; word-wrap: break-word; }',
    '.kmw-msg.bot .kmw-bubble{ background: var(--bot-bg); color: #222; border-bottom-left-radius: 4px; }',
    '.kmw-msg.user .kmw-bubble{ background: var(--accent); color: #fff; border-bottom-right-radius: 4px; }',
    // Indicator „scrie…"
    '.kmw-typing{ display: inline-flex; gap: 4px; align-items: center; padding: 12px 14px; background: var(--bot-bg); border-radius: 14px; border-bottom-left-radius: 4px; }',
    '.kmw-typing span{ width: 7px; height: 7px; background: #bbb; border-radius: 50%; animation: kmwBlink 1.2s infinite both; }',
    '.kmw-typing span:nth-child(2){ animation-delay: .2s; } .kmw-typing span:nth-child(3){ animation-delay: .4s; }',
    '@keyframes kmwBlink{ 0%,80%,100%{ opacity:.3; transform: scale(.8);} 40%{ opacity:1; transform: scale(1);} }',
    // Quick replies
    '.kmw-quick{ display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px 8px; background: #fafafa; }',
    '.kmw-chip{ border: 1px solid var(--accent); color: var(--accent); background:#fff; border-radius: 20px; padding: 6px 12px; font-size: 12px; cursor: pointer; transition: all .15s ease; }',
    '.kmw-chip:hover{ background: var(--accent); color:#fff; }',
    // Butoane contact (fallback)
    '.kmw-actions{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }',
    '.kmw-actions a{ text-decoration: none; font-size: 13px; font-weight: 700; padding: 8px 14px; border-radius: 10px; }',
    '.kmw-actions .kmw-wa{ background:#25D366; color:#fff; }',
    '.kmw-actions .kmw-ct{ background: var(--dark); color:#fff; }',
    // Input
    '.kmw-foot{ border-top: 1px solid var(--line); padding: 10px; display: flex; gap: 8px; align-items: flex-end; background:#fff; }',
    '.kmw-foot textarea{ flex: 1; resize: none; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font-size: 14px; max-height: 90px; outline: none; }',
    '.kmw-foot textarea:focus{ border-color: var(--accent); }',
    '.kmw-send{ background: var(--accent); border: none; width: 42px; height: 42px; border-radius: 10px; cursor: pointer; display:flex; align-items:center; justify-content:center; flex: 0 0 auto; transition: background .2s ease; }',
    '.kmw-send:hover{ background: var(--accent-dark); }',
    '.kmw-send svg{ width: 20px; height: 20px; fill:#fff; }',
    '.kmw-cred{ text-align:center; font-size: 10px; color:#aaa; padding: 4px 0 8px; background:#fff; }',
    '@media (max-width: 420px){ .kmw-panel{ height: calc(100vh - 100px); } }'
  ].join('\n');

  // ------------------------------------------------------------------
  // 4) ICONIȚE (SVG inline)
  // ------------------------------------------------------------------
  var ICON_CHAT = '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM7 9h10v2H7V9zm0 4h7v2H7v-2z"/></svg>';
  var ICON_BOT = '<svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2v1h3a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h3V4a2 2 0 0 1 2-2zM8.5 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>';

  // ------------------------------------------------------------------
  // 5) CONSTRUCȚIA DOM
  // ------------------------------------------------------------------
  var host = document.createElement('div');
  host.id = 'kmw-chat-host';
  var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  shadow.appendChild(styleEl);

  var root = document.createElement('div');
  root.className = 'kmw-root';
  root.innerHTML =
    '<div class="kmw-panel" role="dialog" aria-label="' + CFG.title + '">' +
      '<div class="kmw-head">' +
        '<div class="kmw-ava">' + ICON_BOT + '</div>' +
        '<div><div class="kmw-t">' + CFG.title + '</div><div class="kmw-s">' + CFG.subtitle + '</div></div>' +
        '<button class="kmw-close" aria-label="Închide">&times;</button>' +
      '</div>' +
      '<div class="kmw-body"></div>' +
      '<div class="kmw-quick"></div>' +
      '<div class="kmw-foot">' +
        '<textarea rows="1" placeholder="' + CFG.placeholder + '" aria-label="Mesaj"></textarea>' +
        '<button class="kmw-send" aria-label="Trimite">' + ICON_SEND + '</button>' +
      '</div>' +
      '<div class="kmw-cred">Asistent virtual KMW</div>' +
    '</div>' +
    '<button class="kmw-fab" aria-label="Deschide chat">' + ICON_CHAT + '<span class="kmw-badge">1</span></button>';
  shadow.appendChild(root);

  document.body.appendChild(host);

  // Referințe
  var fab = root.querySelector('.kmw-fab');
  var badge = root.querySelector('.kmw-badge');
  var panel = root.querySelector('.kmw-panel');
  var body = root.querySelector('.kmw-body');
  var quick = root.querySelector('.kmw-quick');
  var input = root.querySelector('textarea');
  var sendBtn = root.querySelector('.kmw-send');
  var closeBtn = root.querySelector('.kmw-close');

  var QUICK_REPLIES = ['Livrare', 'Retur', 'Plată', 'Contact'];

  // ------------------------------------------------------------------
  // 6) LOGICĂ
  // ------------------------------------------------------------------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function scrollDown() { body.scrollTop = body.scrollHeight; }

  function addMessage(text, who) {
    var wrap = document.createElement('div');
    wrap.className = 'kmw-msg ' + who;
    var bubble = document.createElement('div');
    bubble.className = 'kmw-bubble';

    if (text === '__CONTACT__') {
      bubble.innerHTML = 'Te pun în legătură cu un coleg:' + buildActions();
    } else {
      bubble.innerHTML = esc(text);
    }
    wrap.appendChild(bubble);
    body.appendChild(wrap);
    scrollDown();
  }

  function buildActions() {
    var html = '<div class="kmw-actions">';
    if (CFG.whatsapp) {
      html += '<a class="kmw-wa" target="_blank" rel="noopener" href="https://wa.me/' + CFG.whatsapp + '">WhatsApp</a>';
    }
    html += '<a class="kmw-ct" href="' + CFG.contactUrl + '">Formular contact</a>';
    html += '</div>';
    return html;
  }

  var typingEl = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'kmw-msg bot';
    typingEl.innerHTML = '<div class="kmw-typing"><span></span><span></span><span></span></div>';
    body.appendChild(typingEl);
    scrollDown();
  }
  function hideTyping() {
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    typingEl = null;
  }

  function botRespond(text) {
    showTyping();
    getBotReply(text).then(function (reply) {
      // mică întârziere „umană" pentru realism
      setTimeout(function () {
        hideTyping();
        addMessage(reply, 'bot');
      }, 500 + Math.random() * 500);
    }).catch(function () {
      hideTyping();
      addMessage(FALLBACK, 'bot');
    });
  }

  function handleSend() {
    var text = input.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    input.value = '';
    input.style.height = 'auto';
    botRespond(text);
  }

  function renderQuick() {
    quick.innerHTML = '';
    QUICK_REPLIES.forEach(function (q) {
      var chip = document.createElement('button');
      chip.className = 'kmw-chip';
      chip.textContent = q;
      chip.addEventListener('click', function () {
        addMessage(q, 'user');
        botRespond(q);
      });
      quick.appendChild(chip);
    });
  }

  var greeted = false;
  function openPanel() {
    root.classList.add('open');
    badge.style.display = 'none';
    if (!greeted) {
      greeted = true;
      showTyping();
      setTimeout(function () {
        hideTyping();
        addMessage(CFG.greeting, 'bot');
        renderQuick();
      }, 600);
    }
    setTimeout(function () { input.focus(); }, 250);
  }
  function closePanel() { root.classList.remove('open'); }
  function togglePanel() { root.classList.contains('open') ? closePanel() : openPanel(); }

  // Evenimente
  fab.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', closePanel);
  sendBtn.addEventListener('click', handleSend);

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  // auto-resize textarea
  input.addEventListener('input', function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 90) + 'px';
  });
  // Escape închide
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('open')) closePanel();
  });

  // API public (opțional): window.KMW_CHAT.open()/close()/send('text')
  window.KMW_CHAT = {
    open: openPanel,
    close: closePanel,
    send: function (t) { input.value = t; handleSend(); },
    rules: RULES,          // ca să poți edita/adăuga reguli din afară
    config: CFG
  };
})();
