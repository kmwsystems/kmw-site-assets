// Capture cross-origin errors from external scripts (YouTube API, Mailchimp)
// so they don't pollute the console.
window.addEventListener('error', function(e) {
 if (!e.filename || e.message === 'Script error.') { e.preventDefault(); return false; }
}, true);
var EPP = (function() {
 // ── YOUTUBE ──
 var ytPlayer, isMuted = true;
 var _prevYTReady = window.onYouTubeIframeAPIReady;
 window.onYouTubeIframeAPIReady = function() {
 if (typeof _prevYTReady === 'function') _prevYTReady();
 ytPlayer = new YT.Player('yt-player', {
 width: '100%',
 height: '100%',
 videoId: 'nUA5OgpJGgU',
 playerVars: { autoplay: 1, mute: 1, loop: 1, playlist: 'nUA5OgpJGgU', rel: 0, showinfo: 0, controls: 0, modestbranding: 1, playsinline: 1 },
 events: { onReady: function(e) { e.target.playVideo(); }, onStateChange: onYtStateChange }
 });
 };
 if (!window.YT || !window.YT.Player) {
 var tag = document.createElement('script');
 tag.src = 'https://www.youtube.com/iframe_api';
 document.head.appendChild(tag);
 } else {
 window.onYouTubeIframeAPIReady();
 }
 function unmuteVideo() {
 if (!ytPlayer) return;
 var btn = document.getElementById('unmute-btn');
 if (isMuted) {
 ytPlayer.unMute(); ytPlayer.setVolume(80); isMuted = false;
 // YouTube sometimes pauses on volume change — force resume.
 setTimeout(function() { try { ytPlayer.playVideo(); } catch (e) {} }, 50);
 if (btn) btn.classList.add('ep-unmuted');
 document.getElementById('unmute-icon').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15z"/>';
 document.getElementById('unmute-label').textContent = 'Oprește sunetul';
 } else {
 ytPlayer.mute(); isMuted = true;
 setTimeout(function() { try { ytPlayer.playVideo(); } catch (e) {} }, 50);
 if (btn) btn.classList.add('ep-unmuted');
 document.getElementById('unmute-icon').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>';
 document.getElementById('unmute-label').textContent = 'Activează sunetul';
 }
 }
 // Safety net: if playback ever pauses (e.g. tab refocus, YT internal hiccup),
 // auto-resume so the hero video keeps looping silently in the background.
 function onYtStateChange(e) {
 if (e && e.data === YT.PlayerState.PAUSED) {
 setTimeout(function() { try { ytPlayer.playVideo(); } catch (err) {} }, 50);
 }
 }
 // ── GALERIE ──
 var galleryImages = [
 'https://cdn.contentspeed.ro/kmw.websales.ro/cs-content/cs-photos/wysiwyg/aae71352fc20e1e6318b08459467113f-1776425852.jpeg',
 'https://cdn.contentspeed.ro/kmw.websales.ro/cs-content/cs-photos/wysiwyg/34b890f60ce19689a925a2518b24b7c7-1776425901.jpeg',
 'https://cdn.contentspeed.ro/kmw.websales.ro/cs-content/cs-photos/wysiwyg/76501b7055f151dea2cf8bbb9030f973-1776425909.jpeg',
 'https://cdn.contentspeed.ro/kmw.websales.ro/cs-content/cs-photos/wysiwyg/888c3f4ca38fbf64d5210cce2939e9ef-1776425914.jpeg'
 ];
 var galleryIndex = 0;
 function openGallery(i) { galleryIndex = i; updateModal(); document.getElementById('ep-gallery-modal').classList.remove('ep-hidden'); document.body.style.overflow = 'hidden'; }
 function closeGallery() { document.getElementById('ep-gallery-modal').classList.add('ep-hidden'); document.body.style.overflow = ''; }
 function handleModalClick(e) { if (e.target === document.getElementById('ep-gallery-modal')) closeGallery(); }
 function galleryPrev() { galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length; updateModal(); }
 function galleryNext() { galleryIndex = (galleryIndex + 1) % galleryImages.length; updateModal(); }
 function setGalleryIndex(i) { galleryIndex = i; updateModal(); }
 function updateModal() {
 document.getElementById('ep-gallery-modal-img').src = galleryImages[galleryIndex];
 document.getElementById('ep-gallery-counter').textContent = (galleryIndex + 1) + '/' + galleryImages.length;
 document.querySelectorAll('.ep-modal-thumb').forEach(function(el, i) { el.classList.toggle('ep-active-modal-thumb', i === galleryIndex); });
 document.querySelectorAll('.ep-gallery-thumb').forEach(function(el, i) { el.classList.toggle('ep-active-thumb', i === galleryIndex); });
 }
 document.addEventListener('keydown', function(e) {
 var modal = document.getElementById('ep-gallery-modal');
 if (!modal || modal.classList.contains('ep-hidden')) return;
 if (e.key === 'ArrowLeft') galleryPrev();
 else if (e.key === 'ArrowRight') galleryNext();
 else if (e.key === 'Escape') closeGallery();
 });
 // ── FAQ ──
 function toggleFAQ(btn) {
 var item = btn.parentElement;
 var allItems = document.querySelectorAll('.ep-faq-item');
 if (item.classList.contains('ep-faq-open')) {
 item.classList.remove('ep-faq-open');
 } else {
 allItems.forEach(function(i) { i.classList.remove('ep-faq-open'); });
 item.classList.add('ep-faq-open');
 }
 }
 // ── FORM ──
 function toggleFormFields() {
 var radio = document.querySelector('input[name="MMERGE5"][value="Firmă / Instalator"]');
 document.getElementById('ep-instalatorFields').classList.toggle('ep-hidden', !radio.checked);
 }
 function initContactForm() {
 var form = document.getElementById('ep-contactForm');
 if (!form) return;
 form.addEventListener('submit', function(e) {
 var required = form.querySelectorAll('[required]');
 var valid = true;
 required.forEach(function(el) {
 if (!el.value.trim()) { el.style.borderColor = '#E31B2B'; el.style.boxShadow = '0 0 0 3px rgba(227,27,43,0.15)'; valid = false; }
 else { el.style.borderColor = ''; el.style.boxShadow = ''; }
 });
 if (!valid) { e.preventDefault(); return; }
 setTimeout(function() {
 form.style.display = 'none';
 document.getElementById('ep-success-msg').classList.remove('ep-hidden');
 }, 800);
 });
 }
 if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initContactForm); } else { setTimeout(initContactForm, 0); }
 // ── CAROUSEL ──
 var productsData = [
 { name: "Control Acces Standalone Wi-Fi cu recunoaștere facială și amprentă KMW", code: "KM-CAFR241", image: "https://cdn.contentspeed.ro/kmw.websales.ro/cs-content/cs-photos/products/original/control-acces-standalone-wi-fi-cu-recunoatere-fa_11993_1_17648332482689.jpg", promo: false, url: "https://kmw.ro/control-acces-controlere/control-acces-standalone-wi-fi-cu-recunoastere-faciala-si-amprenta-kmw-km-cafr241-km-cafr241.html" },
 { name: "Cutie de distribuție de exterior din ABS KMW", code: "KM-AB300", image: "https://cdn.contentspeed.ro/kmw.websales.ro/cs-content/cs-photos/products/original/cutie-de-distribuie-de-exterior-din-abs-kmw-km-a_11127_3_17016821057491.jpg", promo: true, url: "https://kmw.ro/accesorii/suporti-doze-si-adaptoare/cutie-de-distributie-de-exterior-din-abs-kmw-km-ab300-km-ab300.html" },
 { name: "Sursă de alimentare cu backup 12V / 4A KMW", code: "KM-PS4A12V/B", image: "https://cdn.contentspeed.ro/kmw.websales.ro/cs-content/cs-photos/products/original/surs-de-alimentare-cu-backup-12v-4a-km-ps4a12v_11677_1_17422175702037.jpg", promo: false, url: "https://kmw.ro/accesorii/surse-de-alimentare/sursa-de-alimentare-cu-backup-12v-/-4a-kmw-km-ps4a12v/b-km-ps4a12v/b.html" },
 { name: "Acumulator 7.2AH/12V MB", code: "Acumulator7.2AH/12VMB", image: "https://cdn.contentspeed.ro/kmw.websales.ro/cs-content/cs-photos/products/original/acumulator-72ah12v-mb_11104_1_16986683762373.jpg", promo: true, url: "https://www.kmw.ro/accesorii/surse-de-alimentare/acumulator-7-2ah/12v-mb-acumulator7-2ah/12vmb.html" },
 { name: "Router wireless 4G de exterior KMW KM-R4G-W", code: "KM-R4G-W", image: "https://cdn.contentspeed.ro/kmw.websales.ro/cs-content/cs-photos/products/original/router-wireless-4g-de-exterior-kmw-km-r4g-w_10850_8_17176508039572.jpg", promo: false, url: "https://www.kmw.ro/echipamente-de-retea/wireless-si-accesorii/router-wireless-4g-de-exterior-kmw-km-r4g-w-km-r4g-w.html" }
 ];
 function renderProducts() {
 var c = document.getElementById('ep-shop-products-container');
 if (!c) return;
 c.innerHTML = productsData.map(function(p) {
 return '<a href="' + (p.url||'#') + '" class="ep-product-card">' +
 (p.promo ? '<div class="ep-product-badge">PROMO</div>' : '') +
 '<div class="ep-product-img-wrap"><img src="' + p.image + '" alt="' + p.name + '"></div>' +
 '<div class="ep-product-info"><p class="ep-product-name">' + p.name + '</p><span class="ep-product-code">' + p.code + '</span><p class="ep-product-price">Preț disponibil la cerere</p></div>' +
 '<div class="ep-product-cta-wrap"><div class="ep-product-cta"><i>»</i><span>Cere info</span></div></div></a>';
 }).join('');
 }
 function getCardWidth() { var c = document.getElementById('ep-shop-products-container'); var f = c && c.firstElementChild; return f ? f.offsetWidth + 16 : 300; }
 function getActiveIndex() { var c = document.getElementById('ep-shop-products-container'); return Math.round(c.scrollLeft / getCardWidth()); }
 function updateDots() {
 var d = document.getElementById('ep-carousel-dots'); if (!d) return;
 var active = getActiveIndex();
 Array.from(d.children).forEach(function(dot, i) { dot.classList.toggle('active', i === active); });
 }
 function renderDots() {
 var d = document.getElementById('ep-carousel-dots'); if (!d) return;
 d.innerHTML = productsData.map(function(_, i) {
 return '<button class="ep-dot' + (i===0?' active':'') + '" onclick="EPP.scrollToIndex(' + i + ')" aria-label="Slide ' + (i+1) + '"></button>';
 }).join('');
 }
 function scrollToIndex(i) { var c = document.getElementById('ep-shop-products-container'); c.scrollTo({ left: i * getCardWidth(), behavior: 'smooth' }); setTimeout(updateCarouselButtons, 400); }
 function updateCarouselButtons() {
 var c = document.getElementById('ep-shop-products-container');
 var bp = document.getElementById('ep-btn-prev'), bn = document.getElementById('ep-btn-next');
 if (!c || !bp || !bn) return;
 var atStart = c.scrollLeft <= 5, atEnd = c.scrollLeft + c.clientWidth >= c.scrollWidth - 5;
 bp.style.opacity = atStart ? '0' : '1'; bp.style.pointerEvents = atStart ? 'none' : 'auto';
 bn.style.opacity = atEnd ? '0' : '1'; bn.style.pointerEvents = atEnd ? 'none' : 'auto';
 updateDots();
 }
 function scrollCarousel(dir) { var c = document.getElementById('ep-shop-products-container'); c.scrollBy({ left: dir * getCardWidth(), behavior: 'smooth' }); setTimeout(updateCarouselButtons, 400); }
 function init() {
 renderProducts(); renderDots();
 var c = document.getElementById('ep-shop-products-container');
 if (c) c.addEventListener('scroll', updateCarouselButtons);
 setTimeout(updateCarouselButtons, 200);
 window.addEventListener('resize', function() { setTimeout(updateCarouselButtons, 100); });
 }
 if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { setTimeout(init, 0); }
 return { unmuteVideo: unmuteVideo, openGallery: openGallery, closeGallery: closeGallery, handleModalClick: handleModalClick, galleryPrev: galleryPrev, galleryNext: galleryNext, setGalleryIndex: setGalleryIndex, toggleFormFields: toggleFormFields, scrollCarousel: scrollCarousel, scrollToIndex: scrollToIndex, toggleFAQ: toggleFAQ };
})();
// Mailchimp validation
(function() {
 window.fnames = ['EMAIL','FNAME','LNAME','PHONE','MMERGE5','MMERGE6','MMERGE7'];
 window.ftypes = ['email','text','text','phone','radio','text','text'];
})();
// Smooth scroll pentru toate link-urile cu ancora (#)
(function() {
 document.addEventListener('click', function(e) {
  var a = e.target.closest('a[href]');
  if (!a) return;
  var href = a.getAttribute('href');
  var hash = href.indexOf('#') !== -1 ? href.slice(href.indexOf('#')) : null;
  if (!hash || hash === '#') return;
  var target = document.querySelector(hash);
  if (!target) return;
  e.preventDefault();
  var epHeader = document.querySelector('.ep-header');
  var offset = epHeader && epHeader.style.display !== 'none' ? epHeader.offsetHeight : 0;
  var top = target.getBoundingClientRect().top + window.scrollY - offset - 16;
  window.scrollTo({ top: top, behavior: 'smooth' });
 });
})();
(function() {
 var epHeader = document.querySelector('.ep-header');
 var epHero = document.querySelector('.ep-hero');
 if (!epHeader) return;
 function update() {
  var cmsBar = document.querySelector('header#header');
  var cmsVisible = cmsBar && cmsBar.getBoundingClientRect().bottom > 0;
  if (cmsVisible) {
   epHeader.style.display = 'none';
   if (epHero) epHero.style.marginTop = '-20px';
  } else {
   epHeader.style.display = '';
   epHeader.style.top = '0px';
   if (epHero) epHero.style.marginTop = epHeader.offsetHeight + 'px';
  }
 }
 update();
 [100, 300, 600, 1000].forEach(function(ms) { setTimeout(update, ms); });
 var observer = new MutationObserver(update);
 observer.observe(document.documentElement, { childList: true, subtree: true });
 window.addEventListener('scroll', update, { passive: true });
 window.addEventListener('resize', update);
})();
