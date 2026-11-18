(function () {
  'use strict';

  // ----- Before and after sliders -----
  var sliders = [];
  document.querySelectorAll('.ba-stage').forEach(function (stage) {
    var range = stage.querySelector('.ba-range');
    var touched = false;

    function set(value) {
      value = Math.max(0, Math.min(100, value));
      stage.style.setProperty('--pos', value + '%');
      range.value = Math.round(value);
    }
    function at(e) {
      var box = stage.getBoundingClientRect();
      return ((e.clientX - box.left) / box.width) * 100;
    }

    var drag = null;
    stage.addEventListener('pointerdown', function (e) {
      touched = true;
      drag = { x: e.clientX, moved: e.pointerType === 'mouse' };
      if (drag.moved) set(at(e));
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag) return;
      // On touch, wait for a sideways move so scrolling the page past a photo leaves it alone.
      if (!drag.moved && Math.abs(e.clientX - drag.x) < 6) return;
      drag.moved = true;
      set(at(e));
    });
    stage.addEventListener('pointerup', function (e) {
      if (drag && !drag.moved) set(at(e));
      drag = null;
    });
    stage.addEventListener('pointercancel', function () { drag = null; });
    range.addEventListener('input', function () { touched = true; set(Number(range.value)); });

    sliders.push({ stage: stage, set: set, touched: function () { return touched; } });
  });

  // One hint on load: the first slider sweeps once to show it moves.
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (sliders.length && !still && window.requestAnimationFrame) {
    var first = sliders[0];
    var stops = [50, 72, 34, 50];
    var legMs = 520;
    var start = null;
    var sweep = function (now) {
      if (first.touched()) return;
      if (start === null) start = now;
      var t = (now - start) / legMs;
      var leg = Math.floor(t);
      if (leg >= stops.length - 1) { first.set(50); return; }
      var p = t - leg;
      var eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      first.set(stops[leg] + (stops[leg + 1] - stops[leg]) * eased);
      requestAnimationFrame(sweep);
    };
    setTimeout(function () { requestAnimationFrame(sweep); }, 700);
  }

  // ----- Call bar: on once the hero buttons are off screen, off while the form is on screen -----
  var bar = document.querySelector('.callbar');
  var heroActions = document.querySelector('.hero-actions');
  var quote = document.getElementById('quote');
  if (bar && heroActions && 'IntersectionObserver' in window) {
    var heroSeen = true;
    var quoteSeen = false;
    var update = function () { bar.classList.toggle('is-on', !heroSeen && !quoteSeen); };
    bar.hidden = false;
    new IntersectionObserver(function (entries) {
      heroSeen = entries[0].isIntersecting;
      update();
    }).observe(heroActions);
    if (quote) {
      new IntersectionObserver(function (entries) {
        quoteSeen = entries[0].isIntersecting;
        update();
      }, { threshold: 0.15 }).observe(quote);
    }
  }

  // ----- Quote request form -----
  var form = document.querySelector('form.sheet');
  if (!form) return;
  var status = form.querySelector('.form-status');
  var button = form.querySelector('button[type=submit]');
  var business = form.getAttribute('data-business');
  var mode = form.getAttribute('data-mode');

  function fieldError(input, message) {
    var field = input.closest('.field');
    var old = field.querySelector('.field-error');
    if (old) old.remove();
    if (!message) {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      return;
    }
    var note = document.createElement('p');
    note.className = 'field-error';
    note.id = input.id + '-error';
    note.textContent = message;
    field.appendChild(note);
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', note.id);
  }

  function check() {
    var name = form.elements.name;
    var phone = form.elements.phone;
    var bad = [];
    fieldError(name, name.value.trim() ? '' : 'Add your name so we know who to ask for.');
    if (!name.value.trim()) bad.push(name);
    var digits = phone.value.replace(/\D/g, '');
    var phoneOk = digits.length >= 10;
    fieldError(phone, phoneOk ? '' : 'Add a phone number with area code so we can reach you.');
    if (!phoneOk) bad.push(phone);
    if (bad.length) bad[0].focus();
    return !bad.length;
  }

  function summary() {
    var f = form.elements;
    var lines = [
      'Quote request for ' + business,
      'Name: ' + f.name.value.trim(),
      'Phone: ' + f.phone.value.trim()
    ];
    if (f.address.value.trim()) lines.push('Where: ' + f.address.value.trim());
    lines.push('Service: ' + f.service.value);
    if (f.details.value.trim()) lines.push('Details: ' + f.details.value.trim());
    return lines.join('\n');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.textContent = '';
    if (!check()) return;
    if (form.elements.company.value) return; // filled only by bots

    if (mode === 'preview') {
      status.textContent = 'Preview only, so nothing was sent. On the live site this request goes straight to ' + business + '.';
      return;
    }

    if (mode === 'sms') {
      window.location.href = 'sms:' + form.getAttribute('data-sms') + '?&body=' + encodeURIComponent(summary());
      status.textContent = 'Your messages app should open with the request filled in. Press send to finish.';
      return;
    }

    button.disabled = true;
    status.textContent = 'Sending your request.';
    fetch(form.getAttribute('data-endpoint'), {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        form.reset();
        status.textContent = 'Request sent. ' + business + ' will call or text you back.';
      })
      .catch(function () {
        var phone = form.getAttribute('data-phone');
        status.textContent = 'The request did not go through. ' + (phone ? 'Call ' + phone + ' or try again.' : 'Try again in a moment.');
      })
      .then(function () { button.disabled = false; });
  });
})();
