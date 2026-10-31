// Stagworks portfolio. The page pays attention to its visitor, like the games do.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const started = Date.now();

  requestAnimationFrame(() => document.body.classList.add('ready'));

  /* ---------- awareness: clock, dwell time, tab-outs ---------- */
  const fmtClock = d => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const fmtShort = d => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dwellShort = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const dwellLong = s => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);
  const tick = () => {
    const now = new Date();
    const secs = Math.floor((Date.now() - started) / 1000);
    $$('.js-clock').forEach(el => (el.textContent = fmtClock(now)));
    $$('.js-dwell').forEach(el => (el.textContent = dwellShort(secs)));
    $$('.js-dwell-long').forEach(el => (el.textContent = dwellLong(secs)));
  };
  tick();
  setInterval(tick, 1000);

  const title = document.title;
  let hiddenAt = 0, awayTotal = 0, awayCount = 0, lastAway = 0;
  const toast = $('.toast');
  const toastLines = [
    s => `You left for ${s} seconds. I counted.`,
    s => `Again? ${s} seconds this time.`,
    s => `${s} seconds. You keep coming back, though.`,
  ];
  let toastTimer;
  const showToast = text => {
    $('p', toast).textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 5200);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      document.title = 'come back…';
    } else {
      document.title = title;
      if (!hiddenAt) return;
      const s = Math.round((Date.now() - hiddenAt) / 1000);
      hiddenAt = 0;
      if (s < 2) return;
      awayTotal += s; lastAway = s;
      // if Hina is on screen she says it herself; otherwise she leaves a note in the corner
      if (!meta.onReturn(s) && awayCount < toastLines.length) showToast(toastLines[awayCount](s));
      awayCount++;
    }
  });

  /* ---------- hero lantern ---------- */
  const hero = $('.hero');
  const lantern = { x: innerWidth * .5, y: innerHeight * .42, tx: innerWidth * .5, ty: innerHeight * .42, moved: false, visible: true, t: 0 };
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    lantern.tx = e.clientX - r.left; lantern.ty = e.clientY - r.top; lantern.moved = true;
  });
  new IntersectionObserver(([e]) => (lantern.visible = e.isIntersecting)).observe(hero);
  const lanternLoop = () => {
    if (lantern.visible && !reduce) {
      lantern.t += 0.006;
      if (!lantern.moved || !finePointer) { // wander on its own until the visitor takes the light
        const w = hero.clientWidth, h = hero.clientHeight;
        lantern.tx = w * (.5 + .34 * Math.sin(lantern.t * 1.3));
        lantern.ty = h * (.42 + .16 * Math.cos(lantern.t * 1.9));
      }
      lantern.x += (lantern.tx - lantern.x) * .09;
      lantern.y += (lantern.ty - lantern.y) * .09;
      const flicker = 1 + Math.sin(lantern.t * 40) * .012 + Math.sin(lantern.t * 23) * .01;
      hero.style.setProperty('--x', `${lantern.x}px`);
      hero.style.setProperty('--y', `${lantern.y}px`);
      hero.style.setProperty('--r', `${clamp(hero.clientWidth * .2, 180, 320) * flicker}px`);
    }
    requestAnimationFrame(lanternLoop);
  };
  if (!reduce) requestAnimationFrame(lanternLoop);

  /* ---------- cursor ring + magnetic buttons ---------- */
  if (finePointer && !reduce) {
    const ring = $('.cursor-ring');
    let rx = 0, ry = 0, mx = 0, my = 0;
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; ring.classList.add('on'); });
    document.addEventListener('pointerleave', () => ring.classList.remove('on'));
    const loop = () => {
      rx += (mx - rx) * .18; ry += (my - ry) * .18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    $$('a, button, .filmstrip img, .js-meta').forEach(el => {
      el.addEventListener('pointerenter', () => ring.classList.add('big'));
      el.addEventListener('pointerleave', () => ring.classList.remove('big'));
    });
    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px, ${(e.clientY - r.top - r.height / 2) * .35}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
        el.style.transform = '';
        setTimeout(() => (el.style.transition = ''), 500);
      });
    });
    $$('.tilt').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateY(-4px)`;
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });
  }

  /* ---------- statement: words light up as you read ---------- */
  const statement = $('.js-words');
  const wrapWords = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.append(s);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) wrapWords(child);
    });
  };
  wrapWords(statement);
  const words = $$('.w', statement);

  /* ---------- count-up stats ---------- */
  const countIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0), suf = el.dataset.suffix || '';
    if (reduce) { el.textContent = to.toFixed(dec) + suf; return; }
    const t0 = performance.now(), dur = 1600;
    const step = now => {
      const p = clamp((now - t0) / dur, 0, 1), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * eased).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: .6 });
  $$('.js-count').forEach(el => countIO.observe(el));

  /* ---------- reveal on scroll ---------- */
  const revealIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
  }), { threshold: .15 });
  $$('.reveal, .contact').forEach(el => revealIO.observe(el));

  /* ---------- chapters: pinned stage, scrolling steps ---------- */
  const chapters = $$('.chapter').map(ch => ({
    el: ch,
    steps: $$('.step', ch),
    layers: $$('.layer', ch),
    frame: $('.stage-frame', ch),
    counter: $('.js-step', ch),
    active: 0,
  }));
  const setStep = (c, i) => {
    if (c.active === i) return;
    c.active = i;
    c.steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    c.layers.forEach(l => l.classList.toggle('is-active', +l.dataset.step === i));
    if (c.counter) c.counter.textContent = String(i + 1).padStart(2, '0');
    if (!c.el.classList.contains('ac')) return;
    if (i === 2) {
      if (!reduce) {
        c.frame.classList.remove('glitching'); void c.frame.offsetWidth; c.frame.classList.add('glitching');
      }
      meta.start();
    } else meta.stop();
  };

  /* ---------- scroll loop ---------- */
  const nav = $('#nav'), progress = $('.progress');
  const scenes = $$('[data-scene]').filter(el => el !== document.body);
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const vh = innerHeight, sy = scrollY;
    nav.classList.toggle('solid', sy > 30);
    progress.style.transform = `scaleX(${sy / Math.max(1, document.documentElement.scrollHeight - vh)})`;

    const r = statement.getBoundingClientRect();
    const p = clamp((vh * .85 - r.top) / (r.height + vh * .3), 0, 1);
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('on', reduce || i < lit));

    chapters.forEach(c => {
      let idx = 0;
      c.steps.forEach((s, i) => { if (s.getBoundingClientRect().top < vh * .58) idx = i; });
      setStep(c, idx);
    });

    let scene = 'intro';
    scenes.forEach(el => {
      const b = el.getBoundingClientRect();
      if (b.top < vh * .5 && b.bottom > vh * .5) scene = el.dataset.scene;
    });
    if (document.body.dataset.scene !== scene) document.body.dataset.scene = scene;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  requestAnimationFrame(onScroll); // after the rest of this script has set up `meta`

  /* ---------- Royal Interrogator: a sample verdict ---------- */
  const verdicts = {
    release: { stamp: 'Released', text: 'He thanks you and slips back into the city. Two days later, a guard is found with the same heron mark.', chips: [['Conspiracy +12', 'bad'], ["People's trust +4", 'good']] },
    fine: { stamp: 'Fined', text: 'He pays in clipped coin and swears he found the seal in the river.', chips: [['Treasury +5', 'good'], ['Conspiracy +6', 'bad']] },
    exile: { stamp: 'Exiled', text: 'The gates close behind him. Somewhere in the south, a courier never arrives.', chips: [['Conspiracy −8', 'good'], ["King's favour +3", 'good']] },
    scaffold: { stamp: 'Executed', text: 'The square falls silent. The king is pleased. The town remembers.', chips: [["King's favour +6", 'good'], ["People's trust −15", 'bad']] },
  };
  const verdictEl = $('#verdict');
  if (verdictEl) {
    const stamp = $('.stamp', verdictEl), result = $('.verdict-result', verdictEl), buttons = $$('button', verdictEl);
    buttons.forEach(b => b.addEventListener('click', () => {
      const v = verdicts[b.dataset.v];
      buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      stamp.textContent = v.stamp;
      stamp.classList.remove('show'); void stamp.offsetWidth; stamp.classList.add('show');
      result.innerHTML = `<p>${v.text}</p><div class="chips">${v.chips.map(([t, k]) => `<span class="chip ${k}">${t}</span>`).join('')}</div>`;
    }));
  }

  /* ---------- After Class: Hina notices you ---------- */
  const meta = (() => {
    const box = $('.js-meta'), line = $('.js-meta-line'), name = $('.js-meta-name');
    let lines = [], i = -1, typing = null, auto = null, active = false;
    const build = () => {
      const now = new Date(), h = now.getHours();
      const late = h >= 23 || h < 5;
      return [
        'Oh. You actually scrolled all the way down here.',
        `It's ${fmtShort(now)} where you are, isn't it? ${late ? "Shouldn't you be asleep?" : 'Good. Plenty of afternoon left.'}`,
        awayTotal > 0
          ? `You looked away for ${awayTotal} seconds earlier. I counted.`
          : "You haven't looked away once. I like that.",
        "Go on, play the demo. I'll be waiting. I'm always waiting.",
      ];
    };
    const type = text => {
      clearInterval(typing);
      if (reduce) { line.textContent = text; return; }
      let n = 0;
      line.textContent = '';
      line.classList.add('typing');
      typing = setInterval(() => {
        line.textContent = text.slice(0, ++n);
        if (n >= text.length) { clearInterval(typing); typing = null; line.classList.remove('typing'); }
      }, 26);
    };
    const next = () => {
      clearTimeout(auto);
      if (typing) { clearInterval(typing); typing = null; line.textContent = lines[i]; line.classList.remove('typing'); schedule(); return; }
      if (i >= lines.length - 1) return;
      i++;
      name.classList.toggle('glitched', i === lines.length - 1);
      name.textContent = i === lines.length - 1 ? 'H̷i̸n̵a' : 'Hina';
      type(lines[i]);
      schedule();
    };
    const schedule = () => {
      clearTimeout(auto);
      if (i < lines.length - 1) auto = setTimeout(next, lines[i].length * 26 + 2300);
    };
    box.addEventListener('click', next);
    box.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });
    const halt = () => { clearTimeout(auto); clearInterval(typing); typing = null; line.classList.remove('typing'); };
    return {
      start() { // every visit to the scene starts her over, with fresh observations
        if (active) return;
        active = true; halt();
        lines = build(); i = -1; next();
      },
      stop() { active = false; halt(); },
      onReturn(s) { // if she is on screen when you come back, she reacts directly
        if (!active) return false;
        halt();
        lines = [`…You left. ${s} seconds. I counted.`, "It's fine. You came back. They always come back.", "Go on, play the demo. I'll be waiting. I'm always waiting."];
        i = -1; next();
        return true;
      },
    };
  })();

  /* ---------- Royal Interrogator: candle embers ---------- */
  const canvas = $('.embers');
  if (canvas && !reduce) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, running = false, parts = [];
    const dpr = Math.min(2, devicePixelRatio || 1);
    const size = () => { w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const spawn = () => ({ x: Math.random() * w, y: h + 10, vy: .25 + Math.random() * .9, vx: (Math.random() - .5) * .3, r: .6 + Math.random() * 1.8, life: 0, max: 260 + Math.random() * 260, ph: Math.random() * 6.28 });
    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      if (parts.length < 70 && Math.random() < .5) parts.push(spawn());
      parts = parts.filter(p => p.life < p.max && p.y > -20);
      parts.forEach(p => {
        p.life++; p.y -= p.vy; p.x += p.vx + Math.sin((p.life + p.ph * 40) / 40) * .25;
        const a = Math.sin((p.life / p.max) * Math.PI) * .85;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, `rgba(255, 196, 120, ${a})`);
        g.addColorStop(.4, `rgba(255, 120, 40, ${a * .5})`);
        g.addColorStop(1, 'rgba(255, 90, 20, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2); ctx.fill();
      });
      requestAnimationFrame(draw);
    };
    new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; size(); draw(); }
      else if (!e.isIntersecting) running = false;
    }).observe(canvas);
  }

  /* ---------- filmstrips: drag to scroll, click to enlarge ---------- */
  const lb = $('.lightbox'), lbImg = $('img', lb);
  let set = [], idx = 0;
  const show = k => { idx = (k + set.length) % set.length; lbImg.src = set[idx].src; lbImg.alt = set[idx].alt; };
  $$('.filmstrip').forEach(strip => {
    let down = false, startX = 0, startScroll = 0, dragged = false;
    strip.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; dragged = false; startX = e.clientX; startScroll = strip.scrollLeft; });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) { dragged = true; strip.classList.add('dragging'); }
      strip.scrollLeft = startScroll - dx;
    });
    addEventListener('pointerup', () => { down = false; strip.classList.remove('dragging'); });
    $$('img', strip).forEach(img => img.addEventListener('click', () => {
      if (dragged) return;
      set = $$('img', strip); show(set.indexOf(img)); lb.hidden = false;
    }));
  });
  $('.lb-close', lb).onclick = () => (lb.hidden = true);
  $('.lb-prev', lb).onclick = e => { e.stopPropagation(); show(idx - 1); };
  $('.lb-next', lb).onclick = e => { e.stopPropagation(); show(idx + 1); };
  lb.addEventListener('click', e => { if (e.target === lb) lb.hidden = true; });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lb.hidden = true;
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });

  console.log('%cStagworks', 'font: 28px Georgia; color: #f0c870', '\nYou opened the console. Of course you did.\nhttps://stagworks.itch.io');
})();
