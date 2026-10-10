// Behaviour reference: the prototype's full state + handlers (renderVals). Recreate in your framework.
class Component extends DCLogic {
  constructor(props) {
    super(props);
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('ot-proto') || '{}'); } catch (e) {}
    this.state = {
      lang: saved.lang || this.props.lang || 'en', screen: saved.screen || 'signin', step: 0,
      nudge: 'gentle', chans: { whatsapp: true, email: true, call: true },
      one: ONE_SUGG[0], oneDraft: '', mins: 45, oneDone: false,
      running: false, remaining: 45 * 60,
      tasks: TASKS.map(t => ({ ...t })).sort((a, b) => a.time.localeCompare(b.time)), fus: FUS.map(f => ({ ...f })),
      composeId: 't1', composeDraft: null, afterSend: false,
      capState: 'idle', capText: '', capFrom: 'home',
      notif: null, toast: null,
      msgs: [{ from: 'bot', key: 'bot0' }], chatInput: '',
      review: {}, closed: false,
      sIdx: 0, justDone: {}, showLater: false, showDone: false, form: null, fCcOpen: false, fTried: false, tFilter: 'all', remSheet: null, rMode: 'move', quick: null, qq: '', people: CONTACTS.map(c => ({ ...c })), pq: '', ccOpen: false, contact: {}, showErr: false, rSel: null, rTime: '10:00', rView: null, evening: false, focusIdle: false, swipe: null, showAll: false, resched: null, dumpText: '', dumpItems: null, stepsDone: {}, tiny: false,
    };
  }
  screenRef = React.createRef();
  componentDidMount() {
    this.tick = setInterval(() => {
      if (this.state.running && this.state.remaining > 0) this.setState(s => ({ remaining: s.remaining - 1 }));
    }, 1000);
  }
  componentWillUnmount() { clearInterval(this.tick); clearTimeout(this.toastT); clearTimeout(this.capT); }
  wake() { clearTimeout(this.idleT); if (this.state.focusIdle) this.setState({ focusIdle: false }); this.idleT = setTimeout(() => { if (this.state.screen === 'focus' && this.state.running) this.setState({ focusIdle: true }); }, 3500); }
  startTask(p, type) {
    const id = 'p' + Date.now(), nm = { en: p.en + (p.role.en ? ' · ' + p.role.en : ''), ar: p.ar + (p.role.ar ? ' · ' + p.role.ar : '') };
    const t = { id, type, time: '09:30', done: false, en: { title: C.en.newMsg[type].replace('{n}', p.en.split(' ')[0]), who: nm.en }, ar: { title: C.ar.newMsg[type].replace('{n}', p.ar.split(' ')[0]), who: nm.ar }, goal: { en: p.notes || '', ar: p.notes || '' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } };
    this.setState(x => ({ quick: null, qq: '', tasks: [...x.tasks, t].sort((a, b) => a.time.localeCompare(b.time)), contact: { ...x.contact, [id]: { email: p.email || '', dial: p.dial || '+966', phone: p.phone || '', subject: '' } }, composeId: id, composeDraft: null, afterSend: false, screen: 'compose' }));
  }
  saveContact(ct, patch) {
    const name = ct.en.who.split(' ·')[0], nameAr = ct.ar.who.split(' ·')[0];
    this.setState(x => {
      const i = x.people.findIndex(p => p.en === name || p.ar === nameAr);
      const last = { en: 'Just now', ar: 'الحين' };
      if (i >= 0) { const people = [...x.people]; people[i] = { ...people[i], ...patch, last }; const [p] = people.splice(i, 1); return { people: [p, ...people] }; }
      return { people: [{ en: name, ar: nameAr, role: { en: '', ar: '' }, email: '', dial: '+966', phone: '', ...patch, last }, ...x.people] };
    });
  }
  componentDidUpdate(pp, psArg) {
    const ps = psArg || this._prev || {}; this._prev = { ...this.state };
    if (ps.screen !== this.state.screen) {
      if (this.screenRef.current) this.screenRef.current.animate([{ opacity: 0.4, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
      if (this.state.screen === 'focus') this.wake();
    }
    if (ps.running !== this.state.running && this.state.screen === 'focus') this.wake();
    if (!this.state.resched && ps.resched && this.state.rMode !== 'move') this.setState({ rMode: 'move' });
    if (this.state.resched && ps.resched !== this.state.resched) this.setState({ rSel: { y: 2026, m: 9, d: 9 }, rTime: '12:00', rView: { y: 2026, m: 9 } });
    if (ps.composeId !== this.state.composeId || ps.screen !== this.state.screen) { if (this.state.showErr) this.setState({ showErr: false }); }
    if (ps.screen !== this.state.screen && this.state.resched) this.setState({ resched: null });
    if (ps.screen !== this.state.screen || ps.lang !== this.state.lang) {
      try { localStorage.setItem('ot-proto', JSON.stringify({ screen: this.state.screen, lang: this.state.lang })); } catch (e) {}
    }
  }
  ic(name, size = 20, color = 'currentColor', sw = 1.7) {
    const flip = (name === 'arrow' || name === 'back') && this.state.lang === 'ar';
    return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', style: { flex: 'none', transform: flip ? 'scaleX(-1)' : undefined } },
      (P[name] || []).map((p, i) => typeof p[1] === 'string' ? React.createElement(p[0], { key: i, d: p[1] }) : React.createElement(p[0], { key: i, ...p[1] })));
  }
  fmt(s, o) { return Object.keys(o).reduce((a, k) => a.replace('{' + k + '}', o[k]), s); }
  pers(L, s, lang) {
    const a = s.acct || {}; const n = (a.name || '').trim(); if (!n) return L;
    const first = n.split(/\s+/)[0];
    return { ...L, pr_k: lang === 'ar' ? 'صباح الخير يا ' + first : 'GOOD MORNING, ' + first.toUpperCase(), bot0: L.bot0.replace(lang === 'ar' ? 'خالد' : 'Khalid', first),
      set_name: n, set_role: a.job || L.set_role };
  }
  openEvent(k) { this.setState({ screen: 'event', addOpen: false, evFrom: this.state.screen === 'event' ? 'home' : this.state.screen, ev: { k, title: '', link: '', host: '', loc: '', lesson: '', notes: '', plat: 0, who: [], date: 0, time: '10:00', dur: 1, rem: k === 'webinar' || k === 'course' ? 0 : 1, days: [0, 2], done: 2, total: 12 } }); }
  lastVals(s, lang) {
    const ct = s.tasks.find(t => t.id === s.composeId); if (!ct) return { cLast: { has: false } };
    const first = (ct.en.who || '').split(' ')[0], idx = s.people.findIndex(p => p.en.startsWith(first)), p = s.people[idx];
    const hst = p && (HIST[p.en] || [])[0], logs = p && ((s.pLogs || {})[p.en] || [])[0];
    const text = logs ? logs.text : hst ? (lang === 'ar' ? hst[3] : hst[2]) : p && p.last ? p.last[lang] : '';
    return { cLast: { has: !!text, label: lang === 'ar' ? 'آخر مرة' : 'Last time', text, open: () => this.setState({ screen: 'profile', profIdx: idx }) } };
  }
  profVals(s, lang) {
    const X = PFX[lang], L = C[lang], idx = s.profIdx ?? 0, p = s.people[idx] || s.people[0];
    if (!p) return { pf: { l: X.l, acts: [], tags: [], groups: [], next: [], logKinds: [] } };
    const name = p[lang], first = p.en.split(' ')[0], col = k => TYPE_COL[k] || { fg: 'oklch(0.5 0.09 80)', bg: 'oklch(0.96 0.035 90)' }, icn = k => k === 'note' ? 'note' : TYPE_ICON[k];
    const dayOff = n => { const d = new Date(BASE); d.setDate(d.getDate() - n); return d; };
    const fmtD = d => d.toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const seed = (HIST[p.en] || []).map(([n, k, en, ar, tm]) => ({ n, k, text: lang === 'ar' ? ar : en, tm }));
    const fromFus = s.fus.filter(f => f.en.who.includes(first) && f.status === 'done').map(f => ({ n: 0, k: f.ch, text: f[lang].what + ' ✓', tm: '' }));
    const logs = ((s.pLogs || {})[p.en] || []).map(e => ({ n: 0, k: e.k, text: e.text, tm: e.tm }));
    const all = [...logs, ...fromFus, ...seed].sort((a, b) => a.n - b.n);
    const groups = []; all.forEach(e => { const lbl = e.n === 0 ? X.today : e.n === 1 ? X.yest : fmtD(dayOff(e.n)); let g = groups.find(x => x.label === lbl); if (!g) groups.push(g = { label: lbl, items: [] }); g.items.push(e); });
    const gv = groups.map((g, gi) => ({ label: g.label, items: g.items.map((e, i) => ({ text: e.text, meta: [L.types[e.k] || X.kinds[0][1], e.tm].filter(Boolean).join(' · '), bg: col(e.k).bg, icon: this.ic(icn(e.k), 15, col(e.k).fg, 2), line: gi === groups.length - 1 && i === g.items.length - 1 ? 'hidden' : 'visible' })) }));
    const next = s.tasks.filter(t => !t.done && (t.en.who || '').includes(first)).map(t => ({ title: t[lang].title, sub: L.types[t.type], time: t.time === '23:59' ? '' : t.time, bg: TYPE_COL[t.type].bg, icon: this.ic(TYPE_ICON[t.type], 15, TYPE_COL[t.type].fg, 2) }));
    const kind = s.logKind || 'note', txt = s.logText || '';
    const st = (p2, k) => this._startTask && this._startTask(p2, k);
    const act = (k, label, ok, go) => ({ label, bg: TYPE_COL[k].bg, icon: this.ic(TYPE_ICON[k], 18, TYPE_COL[k].fg, 2), op: ok ? 1 : 0.4, go: ok ? go : () => {} });
    return { pf: {
      l: X.l, name, ini: name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(), role: p.role[lang] || '',
      tags: [p.dial && p.phone ? p.dial + ' ' + p.phone : null, p.email || null].filter(Boolean),
      acts: [act('whatsapp', L.types.whatsapp, !!p.phone, () => st && st(p, 'whatsapp')), act('email', L.types.email, !!p.email, () => st && st(p, 'email')), act('call', L.types.call, !!p.phone, () => st && st(p, 'call')), act('meeting', X.l.meet, true, () => { this.openEvent('meeting'); this.setState(x => ({ ev: { ...x.ev, who: [idx] }, evFrom: 'profile' })); })],
      bulbIc: this.ic('bulb', 14, 'oklch(0.45 0.09 80)', 2), notes: ((s.pNotes || {})[p.en]) ?? (p.notes || ''),
      onNotes: e => { const v = e.target.value; this.setState(x => ({ pNotes: { ...(x.pNotes || {}), [p.en]: v } })); },
      hasNext: next.length > 0, next, groups: gv, histN: X.n.replace('{n}', all.length),
      logKinds: X.kinds.map(([k, label]) => ({ label, icon: this.ic(icn(k), 13, col(k).fg, 2.2), bd: kind === k ? '#0b0b0b' : '#ecebe7', bg: kind === k ? '#f3f2ee' : '#fff', pick: () => this.setState({ logKind: k }) })),
      logText: txt, onLog: e => this.setState({ logText: e.target.value }), logBg: txt.trim() ? '#0b0b0b' : '#b5b5b0',
      addLog: () => { if (!txt.trim()) return; const now = new Date(), tm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'); this.setState(x => ({ logText: '', pLogs: { ...(x.pLogs || {}), [p.en]: [{ k: kind, text: txt.trim(), tm }, ...((x.pLogs || {})[p.en] || [])] } })); },
      back: () => this.setState({ screen: 'people' }),
      edit: () => this.setState({ form: { idx, name: p[lang], role: p.role[lang] || '', dial: p.dial || '+966', phone: p.phone || '', email: p.email || '', pref: p.pref || (p.phone ? 'whatsapp' : 'email'), notes: p.notes || '' }, fTried: false, screen: 'contact' }),
    } };
  }
  fuVals(s, lang) {
    const X = FUX[lang], L = C[lang], tab = s.fuTab ?? 0, key = ['due', 'waiting', 'done'][tab];
    const cnt = k => s.fus.filter(f => f.status === k).length, nDue = cnt('due'), nW = cnt('waiting');
    const setF = (id, o) => this.setState(x => ({ fus: x.fus.map(y => y.id === id ? { ...y, ...o } : y) }));
    const rows = s.fus.filter(f => f.status === key).map(f => {
      const v = f[lang], who = v.who.split(' ·')[0], due = f.status === 'due';
      return { who, what: v.what, since: f.justNote ? f.justNote[lang] : v.since, ini: who.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(), tint: TYPE_COL[f.ch].bg, icon: this.ic(TYPE_ICON[f.ch], 11, TYPE_COL[f.ch].fg, 2.4),
        pill: due ? X.due : f.status === 'done' ? X.closed : X.wait, pillBg: due ? 'oklch(0.95 0.04 25)' : f.status === 'done' ? 'oklch(0.95 0.04 150)' : '#f3f2ee', pillFg: due ? 'oklch(0.5 0.17 25)' : f.status === 'done' ? 'oklch(0.45 0.12 150)' : '#55554f',
        isOpen: f.status !== 'done', isDone: f.status === 'done', closeL: X.closeL, reopenL: X.reopen, checkIc: this.ic('check', 16, '#0b0b0b', 2.2),
        btnL: due ? X.nudge : X.remind, btnBg: due ? '#0b0b0b' : '#f3f2ee', btnFg: due ? '#fff' : '#0b0b0b', btnIc: this.ic(due ? 'send' : 'bell', 14, due ? '#fff' : '#0b0b0b', 2),
        nudge: () => { const id = 'nu' + Date.now(), fn = f.en.who.split(' ')[0], fa = f.ar.who.split(' ')[0];
          const t = { id, type: f.ch, time: '09:30', done: false, en: { title: 'Nudge: ' + f.en.what, who: f.en.who }, ar: { title: 'متابعة: ' + f.ar.what, who: f.ar.who }, goal: { en: 'Get a reply on ' + f.en.what.toLowerCase(), ar: 'تحصل رد على ' + f.ar.what }, points: { en: ['Friendly, short', 'Ask for a date'], ar: ['ودّي ومختصر', 'اطلب موعد'] },
            draft: { en: 'Hi ' + fn + ', just checking in on ' + f.en.what.toLowerCase() + '. Any update when you get a moment? Thanks!', ar: 'هلا ' + fa + '، حبيت أتطمّن بخصوص ' + f.ar.what + '. في أي جديد؟ شكراً لك!' } };
          this.setState(x => ({ tasks: [...x.tasks, t], fus: x.fus.map(y => y.id === f.id ? { ...y, justNote: { en: 'Draft ready · not sent yet', ar: 'المسودة جاهزة · ما انرسلت' } } : y) })); this.openCompose(id); },
        close: () => { setF(f.id, { status: 'done', justNote: { en: FUX.en.closedNow, ar: FUX.ar.closedNow } }); this.toast(X.toastClose.replace('{n}', who)); },
        reopen: () => setF(f.id, { status: 'waiting', justNote: null }) };
    });
    return {
      fuSummary: nDue + nW === 0 ? X.sum0 : X.sum.replace('{a}', nDue).replace('{b}', nW),
      fuTabs: X.tabs.map((label, i) => { const on = tab === i, n = [nDue, nW, cnt('done')][i]; return { label, n: String(n), bg: on ? '#fff' : 'transparent', sh: on ? '0 1px 3px rgba(0,0,0,.12)' : 'none', nBg: i === 0 && n ? 'oklch(0.55 0.18 25)' : on ? '#0b0b0b' : '#e0dfdb', nFg: i === 0 && n ? '#fff' : on ? '#fff' : '#55554f', pick: () => this.setState({ fuTab: i }) }; }),
      fuRows: rows, fuEmpty: rows.length === 0, fuEmptyT: X.empty[tab][0], fuEmptyS: X.empty[tab][1], fuEmptyIc: this.ic('check', 24, 'oklch(0.45 0.12 150)', 2.4),
    };
  }
  evVals(s, lang) {
    const X = EVX[lang], e = s.ev || { k: 'meeting', title: '', who: [], days: [], plat: 0, date: 0, time: '10:00', dur: 1, rem: 1, done: 0, total: 10 }, k = e.k, L = C[lang];
    const up = o => this.setState(x => ({ ev: { ...x.ev, ...o } }));
    const on = f => ev => up({ [f]: ev.target.value });
    const chip = (sel, fg) => ({ bd: sel ? (fg || '#0b0b0b') : '#e4e4e0', bg: sel ? '#f3f2ee' : '#fff' });
    const col = TYPE_COL[k] || TYPE_COL.reminder, ok = e.title.trim().length > 0, multi = k === 'meeting';
    const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
    const plats = k === 'course' ? X.cplats : X.plats;
    const save = () => {
      if (!ok) return;
      const people = e.who.map(i => s.people[i]).filter(Boolean), whoN = people.map(p => p[lang]).join(', ');
      const sub = k === 'visit' ? (e.loc || whoN) : k === 'meeting' ? [plats[e.plat], whoN].filter(Boolean).join(' · ') : k === 'webinar' ? (e.host || X.head[k]) : [plats[e.plat], e.lesson].filter(Boolean).join(' · ');
      const id = 'e' + Date.now(), tm = e.date === 0 ? e.time : '23:59', when = e.date === 0 ? null : { en: (e.date === 1 ? 'Tmw ' : 'This wk ') + e.time, ar: (e.date === 1 ? 'بكرة ' : 'هالأسبوع ') + e.time };
      const t = { id, type: k, time: tm, done: false, remind: ['10', '60', 'custom', null][e.rem], ...(when ? { when } : {}), en: { title: e.title, who: sub }, ar: { title: e.title, who: sub }, goal: { en: e.notes || e.title, ar: e.notes || e.title }, points: { en: [], ar: [] }, draft: { en: '', ar: '' }, link: e.link, loc: e.loc };
      this.setState(x => ({ tasks: [...x.tasks, t].sort((a, b) => a.time.localeCompare(b.time)), screen: s.evFrom || 'home', ev: null }));
      this.toast(e.rem === 3 ? X.toastNoR.replace('{x}', X.head[k].split(' ').pop()) : X.toast.replace('{x}', L.types[k]).replace('{r}', X.rems[e.rem].toLowerCase()), false);
    };
    return {
      ev: { l: X.l, head: X.head[k], icon: this.ic(TYPE_ICON[k] || 'bell', 16, col.fg, 2), bg: col.bg, fg: col.fg, titleL: X.titleL[k], titlePh: X.titlePh[k], title: e.title, link: e.link, host: e.host, loc: e.loc, lesson: e.lesson, notes: e.notes,
        linkPh: X.linkPh[k] || '', notesPh: X.notesPh[k], whoHint: X.whoHint[k] || '', pinIc: this.ic('pin', 18, '#8a8a86', 1.9), mapsUrl: 'https://maps.google.com/?q=' + encodeURIComponent(e.loc || ''),
        showPlat: k === 'meeting' || k === 'course', showLink: k !== 'visit' && !(k === 'meeting' && e.plat === 3), showHost: k === 'webinar', showLoc: k === 'visit' || (k === 'meeting' && e.plat === 3), showWho: k === 'visit' || k === 'meeting',
        showLesson: k === 'course', showDays: k === 'course', showDate: k !== 'course', showDur: k === 'meeting', showProg: k === 'course',
        plats: plats.map((label, i) => ({ label, ...chip(e.plat === i), pick: () => up({ plat: i }) })),
        people: s.people.slice(0, 8).map((p, i) => { const sel = e.who.includes(i), n = p[lang]; return { name: n.split(' ')[0], ini: n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(), bd: sel ? '#0b0b0b' : '#e4e4e0', bg: sel ? '#f3f2ee' : '#fff', avBg: sel ? '#0b0b0b' : '#f0efeb', avFg: sel ? '#fff' : '#3a3a37', pick: () => up({ who: sel ? e.who.filter(x => x !== i) : multi ? [...e.who, i] : [i] }) }; }),
        days: X.wk.map((label, i) => { const sel = e.days.includes(i); return { label, bd: sel ? '#0b0b0b' : '#e4e4e0', bg: sel ? '#0b0b0b' : '#fff', fg: sel ? '#fff' : '#0b0b0b', pick: () => up({ days: sel ? e.days.filter(x => x !== i) : [...e.days, i] }) }; }),
        dates: X.dates.map((label, i) => ({ label, ...chip(e.date === i), pick: () => up({ date: i }) })),
        times: times.map(label => { const sel = e.time === label; return { label, bd: sel ? '#0b0b0b' : '#e4e4e0', bg: sel ? '#0b0b0b' : '#fff', fg: sel ? '#fff' : '#0b0b0b', pick: () => up({ time: label }) }; }),
        durs: X.durs.map((label, i) => ({ label, ...chip(e.dur === i), pick: () => up({ dur: i }) })),
        rems: X.rems.map((label, i) => ({ label, ...chip(e.rem === i), pick: () => up({ rem: i }) })),
        progL: X.prog.replace('{a}', e.done).replace('{b}', e.total), progW: Math.round(e.done / e.total * 100) + '%',
        progUp: () => up({ done: Math.min(e.total, e.done + 1) }), progDn: () => up({ done: Math.max(0, e.done - 1) }),
        saveC: ok ? '#0b0b0b' : '#b5b5b0', saveBg: ok ? '#0b0b0b' : '#b5b5b0', cta: X.cta[k] },
      evOn: { title: on('title'), link: on('link'), host: on('host'), loc: on('loc'), lesson: on('lesson'), notes: on('notes') },
      evSave: save, evCancel: () => this.setState({ screen: s.evFrom || 'home', ev: null }),
      addBtns: ['call', 'email', 'whatsapp', 'reminder', ...EV_TYPES].map(k => ({ label: k === 'reminder' ? L.q_rem : L.types[k], bg: TYPE_COL[k].bg, icon: this.ic(TYPE_ICON[k], 22, TYPE_COL[k].fg, 1.9),
        go: () => k === 'reminder' ? (this.setState({ addOpen: false }), this.startCapture('tasks')) : EV_TYPES.includes(k) ? this.openEvent(k) : this.setState({ addOpen: false, screen: 'home', quick: k, qq: '' }) })),
      addOpen: !!s.addOpen && s.screen === 'tasks', addT: X.addT, addL: X.addL, addVoiceL: X.addVoice, micDk: this.ic('mic', 18, '#0b0b0b', 1.9),
      openAdd: () => this.setState({ addOpen: true }), closeAdd: () => this.setState({ addOpen: false }), stopProp: ev => ev.stopPropagation(),
      addVoice: () => { this.setState({ addOpen: false }); this.startCapture('tasks'); },
    };
  }
  setVals(s, lang) {
    const X = SETX[lang], first = ((s.acct || {}).name || '').trim().split(/\s+/)[0], pro = !!s.pro, yr = (s.pwPlan || 'year') === 'year', mkt = !!s.siMkt;
    const seg = on => ({ bg: on ? '#fff' : 'transparent', sh: on ? '0 1px 3px rgba(0,0,0,.12)' : 'none' });
    const featCol = ['oklch(0.95 0.035 300)', 'oklch(0.95 0.035 250)', 'oklch(0.95 0.04 150)', 'oklch(0.95 0.04 50)', 'oklch(0.95 0.035 200)', 'oklch(0.95 0.04 90)'];
    const featFg = ['oklch(0.55 0.15 300)', 'oklch(0.52 0.14 250)', 'oklch(0.52 0.13 150)', 'oklch(0.55 0.15 50)', 'oklch(0.52 0.12 200)', 'oklch(0.52 0.12 90)'];
    const L = C[lang];
    return {
      st: X.st, pw: X.pw, notPro: !pro, planBadge: pro ? X.st.pro : X.st.free, planBg: pro ? '#0b0b0b' : '#f3f2ee', planFg: pro ? '#fff' : '#6b6b68',
      ic2: { starW: this.ic('star', 20, '#fff', 1.9), chevD: this.ic('chev', 16, '#a8a8a3', 2), globe: this.ic('globe', 17, '#3a3a37', 2), chevW: this.ic(lang === 'ar' ? 'back' : 'chevR', 18, '#fff', 2), chev: this.ic(lang === 'ar' ? 'back' : 'chevR', 18, '#b5b5b0', 2), coffee: this.ic('coffee', 18, 'oklch(0.5 0.12 60)', 1.9), coffeeL: this.ic('coffee', 24, 'oklch(0.5 0.12 60)', 1.9), trash: this.ic('trash', 22, 'oklch(0.52 0.19 25)', 1.9), x: this.ic('x', 18, '#0b0b0b', 2) },
      acc: (() => { const ar = lang === 'ar', o = s.setOpen, mk = (k, ic, bg, fg, v) => ({ open: o === k, rot: o === k ? '180deg' : '0deg', bg, icon: this.ic(ic, 17, fg, 2), v, toggle: () => this.setState({ setOpen: o === k ? null : k }) });
        const nOn = Object.values(s.chans).filter(Boolean).length, nl = (C[lang].nudges.find(n => n[0] === s.nudge) || [])[1];
        return { rem: mk('rem', 'bell', 'oklch(0.95 0.035 300)', 'oklch(0.5 0.15 300)', nl + ' · ' + s.mins + (ar ? ' د' : ' min')), ntf: mk('ntf', 'phone', 'oklch(0.95 0.04 50)', 'oklch(0.52 0.15 50)', ar ? 'مفعّلة' : 'On'), ch: mk('ch', 'msg', 'oklch(0.95 0.04 150)', 'oklch(0.48 0.13 150)', nOn + (ar ? ' مفعّلة' : ' on')), pv: mk('pv', 'lock', 'oklch(0.95 0.035 250)', 'oklch(0.45 0.14 250)', '') }; })(),
      nudgeDesc: ({ en: { gentle: 'One soft notification at the time you set. Snooze from the notification. Sound and vibration follow your settings below.', firm: 'Notifies on time, then again every 10 minutes (up to 3 times) until you mark it done or snooze it.', quiet: 'No sound or vibration. You’ll see a badge and the item in your list — nothing interrupts you.' }, ar: { gentle: 'تنبيه خفيف واحد بالوقت اللي حددته. تقدر تأجّله من الإشعار.', firm: 'ينبهك بالوقت، وبعدها كل ١٠ دقايق (لين ٣ مرات) لين تخلّصه أو تأجّله.', quiet: 'بدون صوت ولا اهتزاز. بس علامة على التطبيق والمهمة بالقائمة.' } })[lang][s.nudge] || '',
      ntf: (() => { const ar = lang === 'ar', tg = (k, label, def) => { const on = (s.ntf || {})[k] ?? def; return { label, track: on ? '#0b0b0b' : '#d6d6d2', knob: on ? (ar ? '-18px' : '18px') : '0px', toggle: () => this.setState(x => ({ ntf: { ...(x.ntf || {}), [k]: !on } })) }; };
        return { label: ar ? 'الإشعارات' : 'Notifications', perm: ar ? 'السماح بالإشعارات' : 'Allow notifications', permS: ar ? 'تتغيّر من إعدادات الجوال' : 'Managed in your phone’s Settings', on: ar ? 'مفعّلة' : 'On',
          openSys: e => { e.preventDefault(); this.toast(ar ? 'نفتح إعدادات الجوال…' : 'Opening phone Settings…', false); }, toggles: [tg('sound', ar ? 'الصوت' : 'Sound', true), tg('vib', ar ? 'الاهتزاز' : 'Vibration', true)] }; })(),
      nudgeSeg: L.nudges.map(([k, label]) => ({ label, ...seg(s.nudge === k), pick: () => this.setState({ nudge: k }) })),
      minSeg: [25, 45, 90].map(m => ({ label: String(m), ...seg(s.mins === m), pick: () => this.setState({ mins: m, remaining: m * 60 }) })),
      mktTrack: mkt ? '#0b0b0b' : '#d6d6d2', mktKnob: mkt ? (lang === 'ar' ? '-18px' : '18px') : '0px',
      goPaywall: () => this.setState({ screen: 'paywall', pwFrom: s.screen }),
      exportData: () => this.toast(X.st.toastExp, false),
      signOut: () => { this.setState({ screen: 'signin', siTerms: false, siErr: false }); this.toast(X.st.toastOut, false); },
      askDelete: () => this.setState({ delOpen: true }), cancelDelete: () => this.setState({ delOpen: false }),
      confirmDelete: () => { this.setState({ delOpen: false, acct: { name: '', phone: '', job: '' }, pro: false, siTerms: false, siMkt: false, screen: 'signin', suStep: 0 }); this.toast(X.st.toastDel, false); },
      delOpen: !!s.delOpen, isPro: pro, tipShow: !!s.tipOpen,
      tipOpen: () => this.setState({ tipOpen: true }), tipClose: () => this.setState({ tipOpen: false }),
      tips: X.st.tipSizes.map((label, i) => ({ label, price: ['$0.99', '$2.99', '$4.99'][i], buy: () => { this.setState({ tipOpen: false }); this.toast(X.st.toastTip, false); } })),
      manageSub: () => this.toast(X.st.toastManage, false),
      ic2x: null,
      pwTitle: X.pw.title.replace('{n}', first ? (lang === 'ar' ? ' يا ' + first : ', ' + first) : ''),
      pwFeats: X.pw.feats.map(([ic, t, sub], i) => ({ t, s: sub, bg: featCol[i], icon: this.ic(ic, 18, featFg[i], 1.9) })),
      pwPlans: [['year', X.pw.year, X.pw.yearSub, '$2.99', X.pw.save], ['month', X.pw.month, X.pw.monthSub, '$4.99', '']].map(([k, name, sub, price, tag]) => { const on = (s.pwPlan || 'year') === k; return { name, sub, price, per: X.pw.per, tag, hasTag: !!tag, bd: on ? '#0b0b0b' : '#e4e4e0', dot: on ? '#0b0b0b' : 'transparent', pick: () => this.setState({ pwPlan: k }) }; }),
      pwFine: yr ? X.pw.fineY : X.pw.fineM,
      pwClose: () => this.setState({ screen: s.pwFrom && s.pwFrom !== 'paywall' ? s.pwFrom : 'settings' }),
      pwBuy: () => { this.setState({ pro: true, screen: s.pwFrom && s.pwFrom !== 'paywall' ? s.pwFrom : 'settings' }); this.toast(X.pw.toastBuy, false); },
      pwRestore: () => this.toast(X.pw.toastRestore, false),
    };
  }
  acctVals(s, lang) {
    const A = ACC[lang], a = s.acct || { name: '', phone: '', job: '' }, terms = !!s.siTerms, mkt = !!s.siMkt, st = s.suStep || 0, first = (a.name || '').trim().split(/\s+/)[0];
    const box = on => ({ bd: on ? '#0b0b0b' : '#c9c9c5', bg: on ? '#0b0b0b' : '#fff', mark: on ? this.ic('check', 14, '#fff', 3) : null });
    const tb = box(terms), mb = box(mkt);
    const signIn = () => { if (!terms) { this.setState({ siErr: true }); return; } this.setState({ screen: 'setup', suStep: 0, siErr: false }); };
    const setA = k => e => { const v = e.target.value; this.setState(x => ({ acct: { ...(x.acct || { name: '', phone: '', job: '' }), [k]: v } })); };
    const ok = st !== 0 || first.length > 0;
    const next = () => { if (!ok) return; this.setState({ screen: 'home', firstRun: true, suStep: 0 }); };
    const legal = (k) => e => { e && e.preventDefault && e.preventDefault(); e && e.stopPropagation && e.stopPropagation(); this.setState({ screen: 'legal', legalK: k, legalFrom: s.screen }); };
    const fmtN = str => str.replace('{n}', first || '');
    return {
      si: A.si, su: A.su, siErr: !!s.siErr && !terms,
      siTerms: () => this.setState({ siTerms: !terms, siErr: false }), siMkt: () => this.setState({ siMkt: !mkt }),
      siTermsBd: tb.bd, siTermsBg: tb.bg, siTermsMark: tb.mark, siMktBd: mb.bd, siMktBg: mb.bg, siMktMark: mb.mark,
      siOp: terms ? 1 : 0.45, siApple: signIn, siGoogle: signIn, siAppleIc: BRAND_IC.apple, siGoogleIc: BRAND_IC.google,
      siOpenTerms: legal('terms'), siOpenPriv: legal('priv'),
      legalTitle: s.legalK === 'priv' ? A.si.privL : A.si.termsL,
      legalBody: (s.legalK === 'priv' ? A.priv : A.terms).map(([h, b]) => ({ h, b })),
      legalBack: () => this.setState({ screen: s.legalFrom && s.legalFrom !== 'legal' ? s.legalFrom : 'signin' }),
      su0: st === 0, su1: st === 1, su2: st === 2, suQ: A.su.q[st], suSub: A.su.sub[st], suHello: fmtN(A.su.hello[st]),
      suDots: [], suJobL: lang === 'ar' ? 'وش تشتغل؟ (اختياري)' : 'What do you do? (optional)',
      suCanSkip: st > 0, suNoSkip: st === 0, suSkip: next,
      suBack: () => st > 0 ? this.setState({ suStep: st - 1 }) : this.setState({ screen: 'signin' }),
      suNext: next, suCtaBg: ok ? '#0b0b0b' : '#b5b5b0', suCta: first ? fmtN(A.su.done) : A.su.cont,
      acctName: a.name, acctPhone: a.phone, acctJob: a.job, onAcctName: setA('name'), onAcctPhone: setA('phone'), onAcctJob: setA('job'),
      jobChips: A.su.jobs.map(j => { const on = a.job === j; return { label: j, bd: on ? '#0b0b0b' : '#e4e4e0', bg: on ? '#f3f2ee' : '#fff', pick: () => this.setState(x => ({ acct: { ...(x.acct || {}), job: j } })) }; }),
      userIni: first ? first[0].toUpperCase() : 'K',
      morningCard: !s.evening && !s.firstRun,
      fr: (() => { const ar = lang === 'ar', dft = s.frDraft || '';
        const done = (one) => { this.setState({ one, firstRun: false, frDraft: '', oneDone: false, remaining: s.mins * 60 }); this.toast(ar ? 'تمام. التذكير بهدوء شغّال — تقدر تغيّره من الإعدادات.' : 'Set. Gentle reminders are on — change it anytime in Settings.', false); };
        return { on: !!s.firstRun && !s.evening, k: ar ? 'أول شي' : 'FIRST THING', q: ar ? 'وش الشي الواحد اللي لو خلّصته اليوم، يومك ناجح؟' : 'What’s the one thing that would make today a good day?',
          ph: ar ? 'اكتبه هنا…' : 'Type it here…', cta: ar ? 'ثبّت' : 'Set', btnBg: dft.trim() ? '#fff' : '#6b6b68', or: ar ? 'أو اختر واحد' : 'Or pick one',
          draft: dft, onDraft: e => this.setState({ frDraft: e.target.value }), onKey: e => { if (e.key === 'Enter' && dft.trim()) done({ en: dft.trim(), ar: dft.trim() }); },
          set: () => { if (dft.trim()) done({ en: dft.trim(), ar: dft.trim() }); },
          chips: ONE_SUGG.map(o => ({ label: o[lang], pick: () => done(o) })),
          skipL: ar ? 'بعدين — وريني يومي' : 'Later — just show me my day', skip: () => this.setState({ firstRun: false }) }; })(),
      homeHello: (() => { const ev = !!s.evening, nm = first || (lang === 'ar' ? 'خالد' : 'Khalid'); return lang === 'ar' ? (ev ? 'مساء الخير يا ' : 'صباح الخير يا ') + nm : (ev ? 'Good evening, ' : 'Good morning, ') + nm; })(),
      seeAllL: lang === 'ar' ? 'الكل' : 'See all', goTasksAll: () => this.go('tasks'),
      ...(() => { const ar = lang === 'ar', d = a.dial || '+966', row = CCS.find(r => r[1] === d && (!a.iso || r[4] === a.iso)) || CCS[0], q = (s.suCcQ || '').trim().toLowerCase().replace('+', '');
        const list = CCS.filter(r => !q || r[2].toLowerCase().includes(q) || r[3].includes(q) || r[1].includes(q) || r[4].toLowerCase() === q);
        return { suCcFlag: row[0], suCcDial: row[1], suCcChev: this.ic('chev', 14, '#6b6b68', 2), suCcOpen: !!s.suCcOpen, suCcQ: s.suCcQ || '',
          suCcToggle: () => this.setState({ suCcOpen: !s.suCcOpen, suCcQ: '' }), onSuCcQ: e => this.setState({ suCcQ: e.target.value }),
          suCcSearchPh: ar ? 'ابحث عن دولة أو رمز' : 'Search country or code', suCcNone: list.length === 0, suCcNoneL: ar ? 'ما لقينا دولة بهالاسم' : 'No country found',
          suPhonePh: row[4] === 'SA' ? '5X XXX XXXX' : (ar ? 'رقم الجوال' : 'Phone number'),
          suCcList: list.map(r => ({ flag: r[0], name: ar ? r[3] : r[2], dial: r[1], bg: r[4] === row[4] ? '#f3f2ee' : '#fff', pick: () => this.setState(x => ({ suCcOpen: false, suCcQ: '', acct: { ...(x.acct || {}), dial: r[1], iso: r[4] } })) })) }; })(),
    };
  }
  go(screen) { this.setState({ screen, notif: null, afterSend: false, resched: null, remSheet: null, quick: null, ccOpen: false, addOpen: false, delOpen: false, tipOpen: false, setOpen: null }); }
  toast(msg, undo = true) { clearTimeout(this.toastT); if (undo) this.snap = { tasks: this.state.tasks, fus: this.state.fus, oneDone: this.state.oneDone }; this.setState({ toast: { msg, undo } }); this.toastT = setTimeout(() => this.setState({ toast: null }), 4000); }
  openCompose(id) { this.setState({ composeId: id, composeDraft: null, afterSend: false, screen: 'compose', notif: null }); }
  markDone(id) { this.setState(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) })); }
  startCapture(from) { this.setState({ screen: 'capture', capState: 'idle', capText: '', capFrom: from || this.state.screen }); }
  parse(text, L) {
    const low = text.toLowerCase();
    const type = /call|اتصل|كلم/.test(low) ? 'call' : /email|mail|إيميل|ايميل/.test(low) ? 'email' : /whatsapp|message|text|reply|واتس|رسال|أرسل|أرد|send/.test(low) ? 'whatsapp' : 'reminder';
    const h = (text.match(/\b(\d{1,2})\b/) || [])[1];
    const day = /tomorrow|بكرة|باكر/.test(low) ? L.tmw : L.today;
    const who = /mohammed|محمد/i.test(text) ? (this.state.lang === 'ar' ? 'محمد السعدي' : 'Mohammed Al-Saadi') : /sara|سارة/i.test(text) ? (this.state.lang === 'ar' ? 'سارة' : 'Sara') : '—';
    let what = text.replace(/^(remind me( to)?|ذكّرني|ذكرني)\s*/i, '');
    if (what.length > 46) what = what.slice(0, 44) + '…';
    return { type, time: (h ? (h.length === 1 ? '0' + h : h) + ':00' : '17:00'), day, who, what };
  }
  addTask(p) {
    const id = 'n' + Date.now();
    const t = { id, type: p.type, time: p.time, done: false, en: { title: p.what, who: p.who }, ar: { title: p.what, who: p.who }, goal: { en: p.what, ar: p.what }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } };
    this.setState(s => ({ tasks: [...s.tasks, t].sort((a, b) => a.time.localeCompare(b.time)) }));
    return t;
  }
  sendChat(text) {
    const L = C[this.state.lang];
    const v = (text ?? this.state.chatInput).trim();
    if (!v) return;
    const low = v.toLowerCase();
    let reply;
    if (/arrange|plan|رتّب|رتب/.test(low)) reply = { from: 'bot', key: 'botPlan', plan: true };
    else if (/waiting|follow|ينتظر|أنتظر|انتظر|متابع/.test(low)) reply = { from: 'bot', key: 'botFu', fu: true };
    else reply = { from: 'bot', key: 'botTask', card: this.parse(v, L), cid: 'c' + Date.now() };
    this.setState(s => ({ msgs: [...s.msgs, { from: 'me', text: v }], chatInput: '' }));
    setTimeout(() => this.setState(s => ({ msgs: [...s.msgs, reply] })), 650);
  }
  confirmCard(m) {
    this.addTask(m.card);
    this.setState(s => ({ msgs: [...s.msgs.map(x => x === m ? { ...x, confirmed: true } : x), { from: 'bot', key: 'botSaved', t: m.card.time }] }));
  }
  fireNotif() {
    const t = this.state.tasks.find(x => !x.done && x.type === 'call') || this.state.tasks.find(x => !x.done);
    if (!t) return;
    this.setState({ notif: t.id, screen: this.state.screen === 'onboard' ? 'home' : this.state.screen });
  }

  renderVals() {
    const s = this.state, lang = s.lang, L = C[lang];
    const tt = t => t[lang];
    const fmtTime = sec => String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    const open = s.tasks.filter(t => !t.done).length;
    const taskView = t => ({
      id: t.id, title: tt(t).title, who: tt(t).who, time: (t.when && typeof t.when === 'object' ? t.when[lang] : t.when) || t.time, type: L.types[t.type],
      icon: this.ic(TYPE_ICON[t.type], 18, TYPE_COL[t.type].fg, 1.9), tint: TYPE_COL[t.type].bg, tc: TYPE_COL[t.type].fg, done: t.done,
      checkBg: t.done ? '#0b0b0b' : '#fff', checkIcon: t.done ? React.createElement('span', { style: { display: 'flex', animation: 'otPop .4s cubic-bezier(.3,1.5,.5,1)' } }, this.ic('check', 14, '#fff', 2.4)) : null,
      titleColor: t.done ? '#9a9a96' : '#0b0b0b', titleDeco: t.done ? 'line-through' : 'none',
      open: () => { if (this.justDragged) return; this.openCompose(t.id); }, toggle: () => { this.markDone(t.id); if (!t.done) this.toast(L.toastDone); },
    });
    const ct = s.tasks.find(t => t.id === s.composeId) || s.tasks[0] || TASKS[0];
    const draft = s.composeDraft ?? tt(ct.draft);
    const appName = ct.type === 'email' ? (lang === 'ar' ? 'البريد' : 'Mail') : 'WhatsApp';
    const nt = s.notif && s.tasks.find(t => t.id === s.notif);
    const total = s.mins * 60;
    const prog = 1 - s.remaining / total;
    const R = 118, CIRC = 2 * Math.PI * R;
    const ring = React.createElement('svg', { width: 260, height: 260, viewBox: '0 0 260 260', style: { transform: 'rotate(-90deg)', position: 'relative' } },
      React.createElement('circle', { cx: 130, cy: 130, r: R, fill: 'none', stroke: '#eceae6', strokeWidth: 3 }),
      React.createElement('circle', { cx: 130, cy: 130, r: R, fill: 'none', stroke: '#0b0b0b', strokeWidth: 3, strokeLinecap: 'round', strokeDasharray: CIRC, strokeDashoffset: CIRC * (1 - prog), style: { transition: 'stroke-dashoffset 1s linear' } }));
    const pulse = React.createElement('div', { style: { position: 'absolute', inset: 0, borderRadius: '50%', background: '#0b0b0b', animation: 'otPulse 1.6s ease-out infinite' } });
    const bars = React.createElement('div', { style: { display: 'flex', gap: 4, alignItems: 'center', height: 36 } },
      [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => React.createElement('div', { key: i, style: { width: 4, height: 36, borderRadius: 2, background: '#0b0b0b', animation: `otBar ${0.7 + (i % 3) * 0.2}s ease-in-out ${i * 0.08}s infinite` } })));
    const parsed = this.parse(L.cap_sample, L);
    const rvTasks = s.tasks.map(t => {
      const st = s.review[t.id] || (t.done ? 'kept' : null);
      return { ...taskView(t), keptBg: st === 'kept' ? '#0b0b0b' : '#fff', keptFg: st === 'kept' ? '#fff' : '#0b0b0b', tmwBg: st === 'tmw' ? '#0b0b0b' : '#fff', tmwFg: st === 'tmw' ? '#fff' : '#0b0b0b',
        dropL: lang === 'ar' ? 'ما عاد يحتاج' : 'Not needed', dropBd: st === 'drop' ? '#0b0b0b' : '#e4e4e0', dropBg: st === 'drop' ? '#0b0b0b' : '#fff', dropIc: this.ic('x', 14, st === 'drop' ? '#fff' : '#6b6b68', 2.2), drop: () => this.setState(x => ({ review: { ...x.review, [t.id]: 'drop' } })),
        keep: () => this.setState(x => ({ review: { ...x.review, [t.id]: 'kept' } })), move: () => this.setState(x => ({ review: { ...x.review, [t.id]: 'tmw' } })) };
    });
    const keptN = rvTasks.filter(t => t.keptBg === '#0b0b0b').length;
    const plan = [
      { time: '09:00', title: tt(s.one), sub: this.fmt(L.focusMeta, { n: s.mins }), icon: this.ic('target', 16) },
      ...s.tasks.filter(t => !t.done).map(t => ({ time: t.time, title: tt(t).title, sub: L.types[t.type] + ' · ' + tt(t).who, icon: this.ic(TYPE_ICON[t.type], 16, TYPE_COL[t.type].fg, 1.9) })),
    ];
    const fuView = s.fus.map(f => ({ who: tt(f).who, what: tt(f).what, since: tt(f).since, status: L.st[f.status], icon: this.ic(TYPE_ICON[f.ch], 18, TYPE_COL[f.ch].fg, 1.9), tint: TYPE_COL[f.ch].bg,
      dot: f.status === 'due' ? '#0b0b0b' : f.status === 'done' ? '#c9c9c5' : '#fff', dotBorder: f.status === 'done' ? '#c9c9c5' : '#0b0b0b',
      isOpen: f.status !== 'done', faded: f.status === 'done' ? 0.45 : 1,
      nudge: () => { this.toast(this.fmt(L.toastNudge, { who: tt(f).who.split(' ·')[0] }), false); },
      close: () => this.setState(x => ({ fus: x.fus.map(y => y.id === f.id ? { ...y, status: 'done' } : y) })) }));

    const rt = s.resched && s.tasks.find(t => t.id === s.resched);
    const dumpItems = (s.dumpItems || []).map((d, i) => ({ what: d.what, typeL: L.types[d.type], icon: this.ic(TYPE_ICON[d.type], 18, TYPE_COL[d.type].fg, 1.9), tc: TYPE_COL[d.type].fg, whenL: d.day + ' · ' + d.time,
      bg: d.keep ? '#0b0b0b' : '#fff', mark: d.keep ? this.ic('check', 14, '#fff', 2.4) : null, op: d.keep ? 1 : 0.4, deco: d.keep ? 'none' : 'line-through',
      toggle: () => this.setState(x => ({ dumpItems: x.dumpItems.map((y, j) => j === i ? { ...y, keep: !y.keep } : y) })) }));
    const keepN = (s.dumpItems || []).filter(d => d.keep).length;
    const stepsSrc = (STEPS[s.one.en] || STEPS._)[lang];
    const curIdx = stepsSrc.findIndex((_, i) => !s.stepsDone[i]);
    const extra = {
      hasResched: !!rt, rTitle: rt ? tt(rt).title : '', rWho: rt ? L.types[rt.type] + ' · ' + tt(rt).who : '',
      reschedOpts: L.rOpts.map(([label, time, short]) => ({ label, time: short, pick: () => {
        this.setState(x => ({ resched: null, tasks: x.tasks.map(t => t.id === rt.id ? { ...t, time, when: short } : t).sort((a, b) => a.time.localeCompare(b.time)) }));
        this.toast(this.fmt(L.toastMoved, { w: label })); } })),
      closeResched: () => this.setState({ resched: null }), openResched: () => this.setState({ resched: ct.id }),
      dumpText: s.dumpText, onDump: e => this.setState({ dumpText: e.target.value }),
      dumpFill: () => this.setState({ dumpText: L.d_sample }),
      dumpEditing: !s.dumpItems, dumpSorted: !!s.dumpItems, dumpItems,
      dumpFound: this.fmt(L.d_found, { n: dumpItems.length }), dumpSaveL: this.fmt(L.d_save, { n: keepN }),
      sortDump: () => {
        const src = (s.dumpText || L.d_sample).split(/\n|[.،,;؛]|\bthen\b/i).map(x => x.trim()).filter(x => x.length > 2);
        this.setState({ dumpText: s.dumpText || L.d_sample, dumpItems: src.map(x => { const p = this.parse(x, L); p.what = p.what.charAt(0).toUpperCase() + p.what.slice(1); return { ...p, keep: true }; }) });
      },
      dumpBack: () => this.setState({ dumpItems: null }),
      saveDump: () => { (s.dumpItems || []).filter(d => d.keep).forEach((d, i) => { const id = 'd' + Date.now() + i; this.setState(x => ({ tasks: [...x.tasks, { id, type: d.type, time: d.time, when: d.day === L.tmw ? (lang === 'ar' ? 'بكرة ' : 'Tmw ') + d.time : null, done: false, en: { title: d.what, who: d.who }, ar: { title: d.what, who: d.who }, goal: { en: d.what, ar: d.what }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } }].sort((a, b) => a.time.localeCompare(b.time)) })); });
        this.setState({ dumpItems: null, dumpText: '', screen: 'home' }); this.toast(this.fmt(L.toastDump, { n: keepN })); },
      goDump: () => this.setState({ screen: 'dump', dumpItems: null }),
      goStuck: () => this.setState({ screen: 'stuck', running: false, tiny: false }),
      stepAllDone: curIdx === -1, stepOpen: curIdx !== -1,
      stepNum: this.fmt(L.s_step, { a: curIdx + 1, b: stepsSrc.length }),
      curStep: curIdx === -1 ? '' : (s.tiny ? L.s_tinyPre : '') + stepsSrc[curIdx],
      smallerL: s.tiny ? L.s_bigger : L.s_smaller,
      toggleTiny: () => this.setState({ tiny: !s.tiny }),
      stepNext: () => this.setState(x => ({ stepsDone: { ...x.stepsDone, [curIdx]: true }, tiny: false })),
      sprint: () => this.setState({ mins: 5, remaining: 300, running: true, screen: 'focus' }),
      steps: stepsSrc.map((st, i) => ({ st, done: !!s.stepsDone[i], cur: i === curIdx,
        dotBg: s.stepsDone[i] ? '#0b0b0b' : '#fff', dotBd: s.stepsDone[i] || i === curIdx ? '#0b0b0b' : '#d6d6d2', mark: s.stepsDone[i] ? this.ic('check', 12, '#fff', 2.6) : null,
        color: s.stepsDone[i] ? '#9a9a96' : i === curIdx ? '#0b0b0b' : '#8a8a86', weight: i === curIdx ? 600 : 400, deco: s.stepsDone[i] ? 'line-through' : 'none' })),
      resetSteps: () => this.setState({ stepsDone: {}, tiny: false }),
      goSettings: () => this.go('settings'),
      ...(() => {
        const NOW = s.evening ? '18:30' : '09:20', toMin = x => { const [h, m] = x.split(':').map(Number); return h * 60 + m; };
        const todays = s.tasks.filter(t => !t.time.startsWith('z')).sort((a, b) => (a.done - b.done) || a.time.localeCompare(b.time));
        const nowIdx = todays.findIndex(t => !t.done && t.time >= NOW);
        const list = todays.map((t, i) => {
          const v = taskView(t), sw = s.swipe && s.swipe.id === t.id ? s.swipe.dx : 0, logical = sw * (lang === 'ar' ? -1 : 1);
          const diff = toMin(t.time) - toMin(NOW);
          const relTxt = diff >= 60 ? Math.floor(diff / 60) + (lang === 'ar' ? 'س ' : 'h ') + (diff % 60) + (lang === 'ar' ? 'د' : 'm') : diff + (lang === 'ar' ? ' دقيقة' : ' min');
          return { ...v, nowBefore: i === nowIdx, rel: i === nowIdx && !t.when ? this.fmt(L.relIn, { m: relTxt }) : '',
            dx: sw + 'px', trans: sw ? 'none' : 'transform .25s ease', swipeBg: logical > 0 ? TYPE_COL.whatsapp.fg : logical < 0 ? TYPE_COL.reminder.fg : 'transparent',
            pDown: e => { this.drag = { id: t.id, x0: e.clientX, moved: false }; },
            pMove: e => { const d = this.drag; if (!d || d.id !== t.id) return; const dx = e.clientX - d.x0; if (Math.abs(dx) > 8) d.moved = true; if (d.moved) this.setState({ swipe: { id: t.id, dx: Math.max(-150, Math.min(150, dx)) } }); },
            pUp: () => { const d = this.drag; if (!d || d.id !== t.id) return; this.drag = null; const cur = this.state.swipe && this.state.swipe.id === t.id ? this.state.swipe.dx : 0; const lg = cur * (lang === 'ar' ? -1 : 1);
              this.setState({ swipe: null }); if (d.moved) { this.justDragged = true; setTimeout(() => { this.justDragged = false; }, 60); }
              if (lg > 90) { this.toast(t.done ? L.toastDone : L.toastDone); this.markDone(t.id); } else if (lg < -90) this.setState({ resched: t.id }); } };
        });
        const vis = list.slice(0, 2);
        return { noTasks: list.length === 0, nowLabel: NOW, visTasks: vis, hasMore: list.length > 2, moreLabel: this.fmt(L.seeAll, { n: s.tasks.filter(t => !t.done).length }), toggleMore: () => this.go('tasks') };
      })(),
      micDown: () => { this.held = false; clearTimeout(this.holdT); this.micPressed = true; this.holdT = setTimeout(() => { this.held = true; this.micPressed = false; this.setState({ screen: 'dump', dumpItems: null }); }, 450); },
      micUp: () => { clearTimeout(this.holdT); if (this.micPressed && !this.held) this.startCapture('home'); this.micPressed = false; },
      micCancel: () => { clearTimeout(this.holdT); this.micPressed = false; },
      evening: s.evening, morning: !s.evening,
      todOpts: [[false, 'Morning'], [true, 'Evening']].map(([v, label]) => ({ label, bg: s.evening === v ? '#0b0b0b' : 'transparent', fg: s.evening === v ? '#fff' : '#0b0b0b', pick: () => this.setState({ evening: v, screen: s.screen === 'onboard' ? 'home' : s.screen }) })),
      evOne: L.rv_one + ': ' + tt(s.one) + ' · ' + (s.oneDone ? L.yes : L.notYet),
      evSum: this.fmt(L.rv_sum, { a: s.tasks.filter(t => t.done).length, b: s.tasks.length }),
      clearTasks: () => this.setState({ tasks: [], screen: 'home', sIdx: SUG_ORDER.length }),
      resetDemo: () => this.setState({ tasks: TASKS.map(t => ({ ...t })).sort((a, b) => a.time.localeCompare(b.time)), fus: FUS.map(x => ({ ...x })), sIdx: 0, oneDone: false, stepsDone: {}, review: {}, closed: false, evening: false, showAll: false, screen: 'home', toast: null }),
      wake: () => this.wake(), screenRef: this.screenRef,
      ...(() => {
        const cc = s.contact[ct.id] || {};
        const phone = cc.phone ?? ct.phone ?? '', email = cc.email ?? ct.email ?? '', subject = cc.subject ?? (ct.subject ? tt(ct.subject) : tt(ct).title);
        const dial = cc.dial || '+966', ccRow = CCS.find(r => r[1] === dial) || CCS[0], local = phone.replace(/\D/g, '').replace(/^0+/, ''), digits = dial.replace(/\D/g, '') + local, phoneOk = local.length >= 8, emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const red = 'oklch(0.55 0.18 25)', setC = o => this.setState(x => ({ contact: { ...x.contact, [ct.id]: { ...(x.contact[ct.id] || {}), ...o } } }));
        const phoneBad = (s.showErr || local.length > 0) && !phoneOk && (s.showErr || local.length >= 6);
        const emailBad = (s.showErr || email.includes('@')) && !emailOk && (s.showErr || email.length > 5);
        const goAfter = () => setTimeout(() => this.setState({ afterSend: true }), 700);
        return {
          ccFlag: ccRow[0], ccDial: ccRow[1], ccOpen: s.ccOpen, toggleCc: () => this.setState({ ccOpen: !s.ccOpen }),
          ccList: CCS.map(r => ({ flag: r[0], dial: r[1], name: lang === 'ar' ? r[3] : r[2], bg: r[1] === dial ? '#f4f4f1' : '#fff', pick: () => { setC({ dial: r[1] }); this.setState({ ccOpen: false }); } })),
          ...(() => {
            const nm = p => p[lang];
            const mk = (p, val, onPick) => ({ ini: p.en.split(' ').slice(0, 2).map(w => w[0]).join(''), name: nm(p), val, pick: onPick });
            const qe = email.toLowerCase(), ql = local;
            const em = s.people.filter(p => p.email && (!qe || p.email.toLowerCase().includes(qe) || p.en.toLowerCase().includes(qe) || p.ar.includes(email))).slice(0, 3);
            const ph = s.people.filter(p => p.phone && (!ql || p.phone.replace(/\D/g, '').includes(ql))).slice(0, 3);
            return {
              showEmSug: !emailOk && em.length > 0 && !!qe, emSugLabel: qe ? L.sugMatch : L.sugRecent, emSug: em.map(p => mk(p, p.email, () => setC({ email: p.email }))),
              showPhSug: !phoneOk && ph.length > 0 && !s.ccOpen && !!ql, phSugLabel: ql ? L.sugMatch : L.sugRecent, phSug: ph.map(p => mk(p, p.dial + ' ' + p.phone, () => setC({ dial: p.dial, phone: p.phone }))),
            };
          })(),
          cPhone: phone, cEmail: email, cSubject: subject, phoneOk, emailOk,
          onPhone: e => setC({ phone: e.target.value }), onEmail: e => setC({ email: e.target.value }), onSubject: e => setC({ subject: e.target.value }),
          phoneBd: phoneBad ? red : phoneOk ? TYPE_COL.whatsapp.fg : (phone ? '#0b0b0b' : '#e4e4e0'), phoneMsg: phoneBad ? L.c_phoneErr : phoneOk ? L.savedNext : L.c_phoneAsk, phoneMsgC: phoneBad ? red : phoneOk ? TYPE_COL.whatsapp.fg : '#6b6b68',
          emailBd: emailBad ? red : emailOk ? TYPE_COL.email.fg : '#e4e4e0', emailMsg: emailBad ? L.c_emailErr : emailOk ? L.savedNext : L.c_emailAsk, emailMsgC: emailBad ? red : emailOk ? TYPE_COL.email.fg : '#6b6b68',
          waBtnBg: phoneOk ? TYPE_COL.whatsapp.fg : '#c9c9c5', emBtnBg: emailOk ? TYPE_COL.email.fg : '#c9c9c5',
          sendWa: () => { if (!phoneOk) return this.setState({ showErr: true }); this.saveContact(ct, { dial, phone }); try { window.open('https://wa.me/' + digits + '?text=' + encodeURIComponent(draft), '_blank'); } catch (e) {} this.toast(this.fmt(L.toastWa, { to: tt(ct).who.split(' ·')[0] }), false); goAfter(); },
          sendEmail: () => { if (!emailOk) return this.setState({ showErr: true }); this.saveContact(ct, { email }); this.toast(this.fmt(L.toastSentTo, { to: email }), false); goAfter(); },
          openMail: () => { if (!emailOk) return this.setState({ showErr: true }); try { window.open('mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(draft), '_blank'); } catch (e) {} this.toast(this.fmt(L.toastHand, { app: appName }), false); goAfter(); },
        };
      })(),
      ...(() => {
        const sel = s.rSel || { y: 2026, m: 9, d: 9 }, view = s.rView || { y: 2026, m: 9 };
        const selDate = new Date(sel.y, sel.m, sel.d), isToday = selDate.getTime() === BASE.getTime();
        const nowT = s.evening ? '18:30' : '09:20';
        const first = new Date(view.y, view.m, 1).getDay(), dim = new Date(view.y, view.m + 1, 0).getDate();
        const cells = [];
        for (let i = 0; i < first; i++) cells.push({ label: '', vis: 'hidden', bd: 'transparent', bg: 'transparent', fg: '#0b0b0b', fw: 400, cur: 'default', pick: () => {} });
        for (let d = 1; d <= dim; d++) {
          const dt = new Date(view.y, view.m, d), past = dt < BASE, isSel = dt.getTime() === selDate.getTime(), tod = dt.getTime() === BASE.getTime();
          cells.push({ label: String(d), vis: 'visible', bd: isSel ? '#0b0b0b' : tod ? '#0b0b0b' : 'transparent', bg: isSel ? '#0b0b0b' : 'transparent', fg: isSel ? '#fff' : past ? '#cfcfcb' : '#0b0b0b', fw: tod || isSel ? 600 : 400, cur: past ? 'default' : 'pointer',
            pick: past ? () => {} : () => this.setState(x => ({ rSel: { y: view.y, m: view.m, d }, rTime: (dt.getTime() === BASE.getTime() && x.rTime <= nowT) ? '12:00' : x.rTime })) });
        }
        const times = []; for (let h = 8; h <= 21; h++) for (const mm of ['00', '30']) times.push(String(h).padStart(2, '0') + ':' + mm);
        const dayLabel = isToday ? L.today : (selDate.getTime() - BASE.getTime() === 864e5 ? L.tmw : L.wk[selDate.getDay()] + ' ' + sel.d + ' ' + L.months[sel.m].slice(0, lang === 'ar' ? 20 : 3));
        const canPrev = view.y > 2026 || view.m > 9;
        return {
          rMonthLabel: L.months[view.m] + ' ' + view.y,
          rWk: L.wk.map(w => ({ w: lang === 'ar' ? w : w.slice(0, 2) })), rCells: cells,
          rPrev: () => canPrev && this.setState({ rView: view.m === 0 ? { y: view.y - 1, m: 11 } : { y: view.y, m: view.m - 1 } }), rPrevOp: canPrev ? 1 : 0.3,
          rNext: () => this.setState({ rView: view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 } }),
          rTimes: times.map(tm => { const dis = isToday && tm <= nowT, on = s.rTime === tm; return { label: tm, bd: on ? '#0b0b0b' : '#e4e4e0', bg: on ? '#0b0b0b' : '#fff', fg: on ? '#fff' : dis ? '#cfcfcb' : '#0b0b0b', cur: dis ? 'default' : 'pointer', pick: dis ? () => {} : () => this.setState({ rTime: tm }) }; }),
          rQuick: L.rQuick.map(([label, off, tm]) => { const dt = new Date(2026, 9, 9 + off), on = dt.getTime() === selDate.getTime() && s.rTime === tm;
            return { label, bd: on ? '#0b0b0b' : '#e4e4e0', bg: on ? '#0b0b0b' : '#fff', fg: on ? '#fff' : '#0b0b0b', pick: () => this.setState({ rSel: { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() }, rView: { y: dt.getFullYear(), m: dt.getMonth() }, rTime: tm }) }; }),
          rSheetT: s.rMode === 'remind' ? L.r_remT : L.r_t, rApplyL: this.fmt(s.rMode === 'remind' ? L.r_remApply : L.r_move, { d: dayLabel, t: s.rTime }),
          rApply: () => { if (!rt) return; if (s.rMode === 'remind') { const lbl = dayLabel + ' · ' + s.rTime; this.setState(x => ({ resched: null, tasks: x.tasks.map(t => t.id === rt.id ? { ...t, remind: 'custom', remindL: lbl } : t) })); this.toast(this.fmt(L.toastRem, { w: lbl })); return; } const iso = sel.y + '-' + String(sel.m + 1).padStart(2, '0') + '-' + String(sel.d).padStart(2, '0');
            this.setState(x => ({ resched: null, tasks: x.tasks.map(t => t.id === rt.id ? { ...t, time: isToday ? s.rTime : 'z' + iso + s.rTime, when: isToday ? null : dayLabel + ' · ' + s.rTime } : t).sort((p, q) => p.time.localeCompare(q.time)) }));
            this.toast(this.fmt(L.toastMoved, { w: dayLabel + ' · ' + s.rTime })); },
        };
      })(),
      fOp: s.focusIdle ? 0.08 : 1, hintOp: s.focusIdle ? 1 : 0,
      glow: React.createElement('div', { style: { position: 'absolute', inset: -34, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,0,0,.16) 0%, rgba(0,0,0,0) 62%)', animation: s.running ? 'otBreath 8s ease-in-out infinite' : 'none' } }),
      quickBtns: [['call', L.types.call], ['email', L.types.email], ['whatsapp', L.types.whatsapp], ['reminder', L.q_rem], ['visit', L.q_x.visit], ['meeting', L.q_x.meeting], ['webinar', L.q_x.webinar], ['course', L.q_x.course]].map(([k, label]) => ({ label, bg: TYPE_COL[k].bg, fg: TYPE_COL[k].fg, icon: this.ic(TYPE_ICON[k], 22, TYPE_COL[k].fg, 1.9), go: () => k === 'reminder' ? this.startCapture('home') : EV_TYPES.includes(k) ? this.openEvent(k) : this.setState({ quick: k, qq: '' }) })),
      ...(() => {
        const k = s.quick; if (!k) return { hasQuick: false, qTitle: '', qList: [], qIcon: null, qBg: '#fff' };
        const q = s.qq.trim().toLowerCase(), has = p => k === 'email' ? !!p.email : !!p.phone;
        const list = s.people.filter(p => !q || p.en.toLowerCase().includes(q) || p.ar.includes(s.qq.trim()) || (p.email || '').toLowerCase().includes(q) || (q.replace(/\D/g, '') && (p.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')))).sort((a, b) => has(b) - has(a));
        return { hasQuick: true, qTitle: L.q_who[k], qBg: TYPE_COL[k].bg, qIcon: this.ic(TYPE_ICON[k], 20, TYPE_COL[k].fg, 1.9), qq: s.qq, onQq: e => this.setState({ qq: e.target.value }), closeQuick: () => this.setState({ quick: null }),
          qNew: () => this.startTask({ en: C.en.newPerson, ar: C.ar.newPerson, role: { en: '', ar: '' } }, k),
          qList: list.map(p => ({ ini: p.en.split(' ').slice(0, 2).map(w => w[0]).join(''), name: p[lang], val: has(p) ? (k === 'email' ? p.email : p.dial + ' ' + p.phone) : (k === 'email' ? L.q_noEmail : L.q_noPhone), valC: has(p) ? '#6b6b68' : '#a8a8a3', pick: () => this.startTask(p, k) })) };
      })(),
      ...(() => {
        const fk = s.tFilter, NOWT = s.evening ? '18:30' : '09:20', isTd = t => !t.time.startsWith('z');
        const clock = t => t.time.startsWith('z') ? t.time.slice(-5) : t.time;
        const whenL = t => (t.when && typeof t.when === 'object' ? t.when[lang] : t.when) || '';
        const typeOk = t => fk === 'all' || fk === 'done' || t.type === fk;
        const live = t => !t.done || s.justDone[t.id];
        const check = t => () => {
          if (t.done) { this.markDone(t.id); return; }
          this.toast(L.toastDone); this.markDone(t.id);
          this.setState(x => ({ justDone: { ...x.justDone, [t.id]: true } }));
          setTimeout(() => this.setState(x => { const j = { ...x.justDone }; delete j[t.id]; return { justDone: j }; }), 1100);
        };
        const rowV = (t, mode) => {
          const v = taskView(t), has = !!t.remind;
          const remTxt = has ? (t.remind === 'custom' ? L.remTinyC : L.remTiny[t.remind]) : '';
          const later = mode === 'later';
          const st = t.done ? null : t.snoozed ? 'snz' : (!t.when && mode !== 'later' && toMin(t.time) < toMin(NOWT)) ? 'over' : null;
          const stMap = { over: [lang === 'ar' ? 'متأخر' : 'Overdue', 'oklch(0.95 0.04 25)', 'oklch(0.5 0.17 25)'], snz: [lang === 'ar' ? 'مؤجّل' : 'Snoozed', 'oklch(0.95 0.035 300)', 'oklch(0.5 0.14 300)'] };
          return { ...v, hasSt: !!st, stL: st ? stMap[st][0] : '', stBg: st ? stMap[st][1] : '', stFg: st ? stMap[st][2] : '', check: check(t), op: s.justDone[t.id] ? 0.45 : 1, ckBd: t.done ? '#0b0b0b' : '#a8a8a3',
            timeL: later ? whenL(t).split(' · ')[0] : clock(t), remMini: later ? clock(t) : remTxt, remC: later ? '#6b6b68' : TYPE_COL.reminder.fg,
            remIcS: has ? this.ic('bell', 11, TYPE_COL.reminder.fg, 2.4) : (later ? null : this.ic('bell', 11, '#c9c9c5', 2)),
            iconS: this.ic(TYPE_ICON[t.type], 13, TYPE_COL[t.type].fg, 2.2), setRem: () => this.setState({ remSheet: t.id }) };
        };
        const today = s.tasks.filter(t => isTd(t) && typeOk(t));
        const pending = today.filter(live).sort((p, q) => p.time.localeCompare(q.time));
        const slipped = pending.filter(t => t.time < NOWT);
        const upcoming = pending.filter(t => t.time >= NOWT);
        const un = fk !== 'done' ? upcoming.find(t => !t.done) : null;
        const rest = upcoming.filter(t => t !== un);
        const toMin = x => { const [h, m] = x.split(':').map(Number); return h * 60 + m; };
        const groups = [];
        const red = 'oklch(0.55 0.17 25)';
        if (fk === 'done') {
          const d = s.tasks.filter(t => t.done);
          if (d.length) groups.push({ label: L.doneF, items: d.map(t => rowV(t)), open: true });
        } else {
          if (slipped.length) groups.push({ label: L.slipped, color: red, items: slipped.map(t => rowV(t)), open: true, hasAction: true, actionL: L.moveTmw, actionC: red,
            action: () => { const ids = slipped.map(t => t.id); this.setState(x => ({ tasks: x.tasks.map(t => ids.includes(t.id) ? { ...t, time: 'z2026-10-10' + t.time, when: { en: 'Tmw ' + t.time, ar: 'بكرة ' + t.time } } : t).sort((p, q) => p.time.localeCompare(q.time)) })); this.toast(this.fmt(L.toastMovedN, { n: ids.length })); } });
          [['morning', L.pMorning, t => t.time < '12:00'], ['afternoon', L.pAfternoon, t => t.time >= '12:00' && t.time < '17:00'], ['evening', L.pEvening, t => t.time >= '17:00']].forEach(([k, label, fn]) => {
            const items = rest.filter(fn); if (items.length) groups.push({ label, items: items.map(t => rowV(t)), open: true });
          });
          const tmw = s.tasks.filter(t => !isTd(t) && t.time.slice(1, 11) === '2026-10-10' && typeOk(t) && live(t)).sort((p, q) => p.time.localeCompare(q.time));
          if (tmw.length) groups.push({ label: L.tmw, items: tmw.map(t => rowV(t)), open: true });
          const lat = s.tasks.filter(t => !isTd(t) && t.time.slice(1, 11) !== '2026-10-10' && typeOk(t) && live(t)).sort((p, q) => p.time.localeCompare(q.time));
          if (lat.length) groups.push({ label: L.later, items: lat.map(t => rowV(t, 'later')), open: s.showLater, hasAction: true, actionL: s.showLater ? L.hide : L.show, actionC: '#55554f', action: () => this.setState({ showLater: !s.showLater }) });
          const dn = today.filter(t => t.done && !s.justDone[t.id]);
          if (dn.length && fk === 'all') groups.push({ label: L.doneToday2, items: dn.map(t => rowV(t)), open: s.showDone, hasAction: true, actionL: s.showDone ? L.hide : L.show, actionC: '#55554f', action: () => this.setState({ showDone: !s.showDone }) });
        }
        const gv = groups.map(g => ({ color: '#0b0b0b', hasAction: false, actionL: '', actionC: '#0b0b0b', action: () => {}, ...g, count: g.items.length }));
        const allToday = s.tasks.filter(isTd), doneToday = allToday.filter(t => t.done).length;
        const noRem = s.tasks.filter(t => !t.done && !t.remind);
        const rs = s.remSheet && s.tasks.find(t => t.id === s.remSheet);
        const setR = (k, w) => { this.setState(x => ({ remSheet: null, tasks: x.tasks.map(t => t.id === rs.id ? { ...t, remind: k } : t) })); this.toast(k ? this.fmt(L.toastRem, { w }) : L.remNone); };
        const unDiff = un ? toMin(un.time) - toMin(NOWT) : 0;
        const actionL = un ? (un.type === 'call' ? this.fmt(L.unCall, { n: tt(un).who.split(' ')[0] }) : L.unAct[un.type]) : '';
        return {
          tkProgL: this.fmt(L.tk_prog, { a: doneToday, b: allToday.length }), tkProgW: (allToday.length ? Math.round(doneToday / allToday.length * 100) : 0) + '%',
          tkGroups: gv, tkEmpty: gv.length === 0 && !un,
          tkChips: [['all', L.all], ['call', L.fl.call], ['email', L.fl.email], ['whatsapp', L.fl.whatsapp], ['reminder', L.fl.reminder], ['done', L.doneF]].map(([k, label]) => { const on = fk === k; return { label, dot: TYPE_COL[k] ? TYPE_COL[k].fg : 'transparent', dotD: TYPE_COL[k] ? 'block' : 'none', bd: on ? '#0b0b0b' : '#e4e4e0', bg: on ? '#0b0b0b' : '#fff', fg: on ? '#fff' : '#0b0b0b', pick: () => this.setState({ tFilter: k }) }; }),
          hasUpNext: !!un, un: un ? { title: tt(un).title, who: tt(un).who, timeL: clock(un), tint: TYPE_COL[un.type].bg, icon: this.ic(TYPE_ICON[un.type], 22, TYPE_COL[un.type].fg, 1.9),
            rel: unDiff <= 0 ? L.nowW : this.fmt(L.relIn, { m: unDiff >= 60 ? Math.floor(unDiff / 60) + (lang === 'ar' ? 'س ' : 'h ') + (unDiff % 60 ? (unDiff % 60) + (lang === 'ar' ? 'د' : 'm') : '') : unDiff + (lang === 'ar' ? ' دقيقة' : ' min') }),
            actionL, open: () => this.openCompose(un.id), done: check(un), later: () => this.setState({ resched: un.id }) } : { title: '', who: '', timeL: '', tint: '#fff', icon: null, rel: '', actionL: '', open: () => {}, done: () => {}, later: () => {} },
          hasNoRem: noRem.length > 0 && fk !== 'done', noRemL: this.fmt(L.noRemB, { n: noRem.length }), remTint: TYPE_COL.reminder.bg, remFg: TYPE_COL.reminder.fg,
          remindAll: () => { const ids = noRem.map(t => t.id); this.setState(x => ({ tasks: x.tasks.map(t => ids.includes(t.id) ? { ...t, remind: 'at' } : t) })); this.toast(this.fmt(L.toastRemAll, { n: ids.length }), true); },
          hasRemSheet: !!rs, remTask: rs ? tt(rs).title + ' · ' + (whenL(rs) || rs.time) : '', closeRem: () => this.setState({ remSheet: null }),
          remOpts: rs ? [...L.remOpts.map(([k, label]) => ({ label, mark: rs.remind === k ? this.ic('check', 18, TYPE_COL.reminder.fg, 2.4) : null, pick: () => setR(k, label) })), { label: L.remNone, mark: !rs.remind ? this.ic('check', 18, '#0b0b0b', 2.4) : null, pick: () => setR(null) }] : [],
          remCustom: () => this.setState({ remSheet: null, resched: rs.id, rMode: 'remind' }),
        };
      })(),
      ...(() => {
        const fm = s.form || { idx: -1, name: '', role: '', dial: '+966', phone: '', email: '', pref: 'whatsapp', notes: '' };
        const upd = o => this.setState(x => ({ form: { ...(x.form || fm), ...o } }));
        const ccRow = CCS.find(r => r[1] === fm.dial) || CCS[0];
        const nameOk = fm.name.trim().length > 1, emailBad = fm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fm.email);
        const save = () => {
          if (!nameOk || emailBad) { this.setState({ fTried: true }); return null; }
          const p = { en: fm.name.trim(), ar: fm.name.trim(), role: { en: fm.role.trim(), ar: fm.role.trim() }, email: fm.email.trim(), dial: fm.dial, phone: fm.phone.trim(), pref: fm.pref, notes: fm.notes.trim(), last: fm.idx >= 0 ? s.people[fm.idx].last : { en: 'Added today', ar: 'انضاف اليوم' } };
          this.setState(x => { const people = [...x.people]; if (fm.idx >= 0) people[fm.idx] = p; else people.unshift(p); return { people, form: null, fTried: false, fCcOpen: false }; });
          return p;
        };
        return {
          newContact: () => this.setState({ form: { idx: -1, name: '', role: '', dial: '+966', phone: '', email: '', pref: 'whatsapp', notes: '' }, fTried: false, screen: 'contact' }),
          fTitle: fm.idx >= 0 ? L.editC : L.newCT, fIni: fm.name.trim() ? fm.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() : '+',
          fName: fm.name, fRole: fm.role, fPhone: fm.phone, fEmail: fm.email, fNotes: fm.notes, fFlag: ccRow[0], fDial: ccRow[1], fCcOpen: s.fCcOpen,
          onFName: e => upd({ name: e.target.value }), onFRole: e => upd({ role: e.target.value }), onFPhone: e => upd({ phone: e.target.value }), onFEmail: e => upd({ email: e.target.value }), onFNotes: e => upd({ notes: e.target.value }),
          fToggleCc: () => this.setState({ fCcOpen: !s.fCcOpen }),
          fCcList: CCS.map(r => ({ flag: r[0], dial: r[1], name: lang === 'ar' ? r[3] : r[2], bg: r[1] === fm.dial ? '#f4f4f1' : '#fff', pick: () => { upd({ dial: r[1] }); this.setState({ fCcOpen: false }); } })),
          fNameErr: s.fTried && !nameOk, fNameBd: s.fTried && !nameOk ? 'oklch(0.55 0.18 25)' : '#0b0b0b', fEmailBd: emailBad ? 'oklch(0.55 0.18 25)' : '#e4e4e0',
          fSaveC: nameOk ? '#0b0b0b' : '#b5b5b0',
          fPrefs: ['whatsapp', 'email', 'call'].map(k => { const on = fm.pref === k; return { label: L.types[k], icon: this.ic(TYPE_ICON[k], 16, TYPE_COL[k].fg, 2), bd: on ? TYPE_COL[k].fg : '#e4e4e0', bg: on ? TYPE_COL[k].bg : '#fff', fg: on ? TYPE_COL[k].fg : '#0b0b0b', pick: () => upd({ pref: k }) }; }),
          fSave: () => { const p = save(); if (p) { this.setState({ screen: 'people' }); this.toast(this.fmt(L.toastC, { n: p.en.split(' ')[0] }), false); } },
          fSaveTask: () => { const p = save(); if (p) this.startTask(p, p.pref || 'whatsapp'); },
          fSaveTaskL: (lang === 'ar' ? { whatsapp: 'احفظ وأرسل واتساب', email: 'احفظ واكتب إيميل', call: 'احفظ واتصل' } : { whatsapp: 'Save & message on WhatsApp', email: 'Save & write an email', call: 'Save & call' })[fm.pref] || L.saveC, fContactL: lang === 'ar' ? 'التواصل (اختياري)' : 'Contact details (optional)',
          fSaveOnlyL: lang === 'ar' ? 'احفظ جهة الاتصال' : 'Save contact',
          fOpensL: ({ whatsapp: lang === 'ar' ? 'يفتح واتساب بمسودة جاهزة' : 'Opens WhatsApp with a draft — you hit send', email: lang === 'ar' ? 'يفتح البريد بمسودة جاهزة' : 'Opens Mail with a draft — you hit send', call: lang === 'ar' ? 'يفتح الاتصال' : 'Opens your phone app' })[fm.pref] || '',
          fCanDel: fm.idx >= 0, fDelL: lang === 'ar' ? 'حذف جهة الاتصال' : 'Delete contact',
          fDelete: () => { if (!window.confirm(lang === 'ar' ? 'تحذف جهة الاتصال؟ السجل بينحذف معها.' : 'Delete this contact? Their history goes too.')) return; this.setState(x => ({ people: x.people.filter((_, i) => i !== fm.idx), form: null, screen: 'people' })); this.toast(lang === 'ar' ? 'انحذفت جهة الاتصال' : 'Contact deleted'); },
          fDup: (() => { const n = fm.name.trim().toLowerCase(), ph = fm.phone.replace(/\D/g, ''), em = fm.email.trim().toLowerCase(); const j = s.people.findIndex((p, i) => i !== fm.idx && ((n.length > 2 && (p.en.toLowerCase() === n || p.ar === fm.name.trim())) || (ph.length > 6 && (p.phone || '').replace(/\D/g, '') === ph) || (em && (p.email || '').toLowerCase() === em))); const p = s.people[j];
            return { has: !!p, msg: p ? (lang === 'ar' ? 'عندك ' + p.ar + ' محفوظ بنفس البيانات.' : 'You already have ' + p.en + ' with these details.') : '', cta: lang === 'ar' ? 'افتحه' : 'Open', open: () => this.setState({ form: null, screen: 'profile', profIdx: j }) }; })(),
          fCancel: () => this.setState({ form: null, fCcOpen: false, fTried: false, screen: 'people' }),
          editContact: idx => { const p = s.people[idx]; this.setState({ form: { idx, name: p[lang], role: p.role[lang] || '', dial: p.dial || '+966', phone: p.phone || '', email: p.email || '', pref: p.pref || (p.phone ? 'whatsapp' : 'email'), notes: p.notes || '' }, fTried: false, screen: 'contact' }); },
        };
      })(),
      showTabs: ['home', 'tasks', 'people', 'followups'].includes(s.screen),
      ...(() => {
        const tab = (i, key, icon) => { const on = s.screen === key; return { bg: on ? 'rgba(255,255,255,.85)' : 'transparent', sh: on ? '0 2px 8px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,1)' : 'none', dot: on ? 0 : 0, label: L.tabs[i], icon: this.ic(icon, 22, on ? '#0b0b0b' : '#9a9a96', on ? 2 : 1.7), fg: on ? '#0b0b0b' : '#9a9a96', fw: on ? 600 : 500, go: () => this.go(key) }; };
        return { tabsL: [tab(0, 'home', 'home'), tab(1, 'tasks', 'list')], tabsR: [tab(2, 'followups', 'loop'), tab(3, 'people', 'users')] };
      })(),
      ...(() => {
        const q = s.pq.trim().toLowerCase();
        const list = s.people.filter(p => !q || p.en.toLowerCase().includes(q) || p.ar.includes(s.pq.trim()) || (p.email || '').toLowerCase().includes(q) || (p.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '#'));
        const startTask = this._startTask = (p, type) => {
          const id = 'p' + Date.now(), nm = { en: p.en + (p.role.en ? ' · ' + p.role.en : ''), ar: p.ar + (p.role.ar ? ' · ' + p.role.ar : '') };
          const t = { id, type, time: '09:30', done: false, en: { title: C.en.newMsg[type].replace('{n}', p.en.split(' ')[0]), who: nm.en }, ar: { title: C.ar.newMsg[type].replace('{n}', p.ar.split(' ')[0]), who: nm.ar }, goal: { en: '', ar: '' }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } };
          this.setState(x => ({ tasks: [...x.tasks, t].sort((a, b) => a.time.localeCompare(b.time)), contact: { ...x.contact, [id]: { email: p.email, dial: p.dial, phone: p.phone, subject: '' } }, composeId: id, composeDraft: null, afterSend: false, screen: 'compose' }));
        };
        return {
          pq: s.pq, onPq: e => this.setState({ pq: e.target.value }), hasPq: !!s.pq, clearPq: () => this.setState({ pq: '' }),
          ppLabel: q ? this.fmt(L.pp_res, { n: list.length }) : L.pp_recent, noPeople: list.length === 0, noPeopleL: this.fmt(L.pp_none, { q: s.pq }),
          people: list.map(p => ({ ini: p.en.split(' ').slice(0, 2).map(w => w[0]).join(''), name: p[lang], role: p.role[lang], hasRole: !!p.role[lang], contactVal: p.email || (p.phone ? p.dial + ' ' + p.phone : ''), last: p.last[lang],
            waBg: TYPE_COL.whatsapp.bg, emBg: TYPE_COL.email.bg, caBg: TYPE_COL.call.bg, waOp: p.phone ? 1 : 0.4, emOp: p.email ? 1 : 0.4,
            waIc: this.ic('msg', 16, TYPE_COL.whatsapp.fg, 2), emIc: this.ic('mail', 16, TYPE_COL.email.fg, 2), caIc: this.ic('phone', 16, TYPE_COL.call.fg, 2),
            edit: () => { const idx = s.people.indexOf(p); const q = s.people[idx]; this.setState({ form: { idx, name: q[lang], role: q.role[lang] || '', dial: q.dial || '+966', phone: q.phone || '', email: q.email || '', pref: q.pref || (q.phone ? 'whatsapp' : 'email'), notes: q.notes || '' }, fTried: false, screen: 'contact' }); },
            wa: () => startTask(p, 'whatsapp'), em: () => startTask(p, 'email'), ca: () => startTask(p, 'call'), open: () => { this.setState({ screen: 'profile', profIdx: s.people.indexOf(p) }); } })),
        };
      })(),
      hasSug: !s.evening && s.sIdx < SUG_ORDER.length,
      sugText: s.sIdx < SUG_ORDER.length ? L.sug[SUG_ORDER[s.sIdx]][0] : '',
      sugYes: s.sIdx < SUG_ORDER.length ? L.sug[SUG_ORDER[s.sIdx]][1] : '',
      sugAccept: () => {
        const k = SUG_ORDER[s.sIdx];
        if (k === 'fresh') this.setState(x => ({ tasks: [...x.tasks, ...L.fresh.map(([title, type], i) => ({ id: 'y' + i + Date.now(), type, time: '12:30', done: false, en: { title, who: lang === 'ar' ? 'من أمس' : 'From yesterday' }, ar: { title, who: lang === 'ar' ? 'من أمس' : 'From yesterday' }, goal: { en: title, ar: title }, points: { en: [], ar: [] }, draft: { en: '', ar: '' } }))].sort((a, b) => a.time.localeCompare(b.time)) }));
        if (k === 'overload') this.setState(x => ({ tasks: x.tasks.map(t => t.id === 't4' ? { ...t, time: '23:59', when: lang === 'ar' ? 'بكرة 09:00' : 'Tmw 09:00' } : t) }));
        if (k === 'fu') this.setState(x => ({ fus: [{ id: 'fs', status: 'waiting', ch: 'email', en: { who: 'Sara · Investor', what: 'Deck v3 + call', since: 'Auto-set · follow up Tue' }, ar: { who: 'سارة · مستثمرة', what: 'العرض 3 + مكالمة', since: 'تلقائي · تابع الثلاثاء' } }, ...x.fus] }));
        this.setState(x => ({ sIdx: x.sIdx + 1 })); this.toast(L.sugToast[k]);
      },
      sugSkip: () => this.setState(x => ({ sIdx: x.sIdx + 1 })),
    };
    return {
      ...extra,
      dir: lang === 'ar' ? 'rtl' : 'ltr', ...this.acctVals(s, lang), ...this.setVals(s, lang), ...this.evVals(s, lang), ...this.fuVals(s, lang), ...this.profVals(s, lang), ...this.lastVals(s, lang), t: this.pers(L, s, lang), isAr: lang === 'ar',
      langOpts: [['en', 'English'], ['ar', 'العربية']].map(([k, label]) => ({ label, bg: lang === k ? '#0b0b0b' : 'transparent', fg: lang === k ? '#fff' : '#0b0b0b', pick: () => this.setState({ lang: k }) })),
      nav: SCREENS.map((k, i) => ({ num: String(i + 1).padStart(2, '0'), label: NAV_LABEL[k], bg: s.screen === k ? '#fff' : 'transparent', go: () => this.go(k) })),
      fireNotif: () => this.fireNotif(),
      is: Object.fromEntries(SCREENS.map(k => [k, s.screen === k])),
      ic: { arrow: this.ic('arrow', 18), back: this.ic('back', 22), mic: this.ic('mic', 22, '#fff', 1.9), bellS: this.ic('bell', 14, '#8a8a86', 1.9), plusW: this.ic('plus', 16, '#fff', 2.2), bellR: this.ic('bell', 18, TYPE_COL.reminder.fg, 1.9), search: this.ic('search', 18, '#6b6b68'), xS: this.ic('x', 14), chevL: this.ic('back', 16), chevR: React.createElement('span', { style: { display: 'flex', transform: 'scaleX(-1)' } }, this.ic('back', 16)), phoneK: this.ic('phone', 18, TYPE_COL.whatsapp.fg, 1.9), mailK: this.ic('mail', 16), sendW: this.ic('send', 18, '#fff'), okG: this.ic('check', 18, TYPE_COL.whatsapp.fg, 2.4), micW: this.ic('mic', 16, '#fff'), moonW: this.ic('moon', 14, '#a8a8a3'), checkW: this.ic('check', 16, '#fff', 2.2), clockW: this.ic('clock', 16, '#fff', 2), micBig: this.ic('mic', 34, '#fff', 1.6), target: this.ic('target', 16), clock: this.ic('clock', 15), send: this.ic('send', 18, '#fff'), x: this.ic('x', 20), plus: this.ic('plus', 20), moon: this.ic('moon', 18), spark: this.ic('spark', 15), phone: this.ic('phone', 18, '#fff'), msgW: this.ic('msg', 18, '#fff'), mailW: this.ic('mail', 18, '#fff'), check: this.ic('check', 16), bell: this.ic('bell', 16, '#fff') },
      // onboarding
      step0: s.step === 0, step1: s.step === 1, step2: s.step === 2,
      dots: [0, 1].map(i => ({ w: i === s.step ? '22px' : '6px', bg: i === s.step ? '#0b0b0b' : '#d6d6d2' })),
      obNext: () => s.step < 1 ? this.setState({ step: s.step + 1 }) : this.go('priority'),
      obChT: lang === 'ar' ? 'وين تتواصل؟' : 'Where do you talk to people?', obChS: lang === 'ar' ? 'أنا أكتب المسودة، وأنت ترسلها من تطبيقك.' : 'I write the draft. You send it from the app you already use.',
      chanTiles: L.chans.map(([k, label]) => { const on = s.chans[k]; return { label, icon: this.ic(TYPE_ICON[k], 20, TYPE_COL[k].fg, 1.9), tint: TYPE_COL[k].bg, bd: on ? '#0b0b0b' : '#e4e4e0', bg: '#fff', ckBg: on ? '#0b0b0b' : '#e4e4e0', ck: on ? this.ic('check', 11, '#fff', 3) : null, toggle: () => this.setState(x => ({ chans: { ...x.chans, [k]: !x.chans[k] } })) }; }),
      obCta: s.step < 1 ? L.cont : L.start, obSkip: () => this.go('priority'),
      nudges: L.nudges.map(([k, label, sub]) => ({ label, sub, bd: s.nudge === k ? '#0b0b0b' : '#e4e4e0', dot: s.nudge === k ? '#0b0b0b' : '#fff', pick: () => this.setState({ nudge: k }) })),
      chans: L.chans.map(([k, label]) => ({ label, icon: this.ic(TYPE_ICON[k], 20, TYPE_COL[k].fg, 1.9), on: s.chans[k], knobX: s.chans[k] ? (lang === 'ar' ? '-18px' : '18px') : '0px', trackBg: s.chans[k] ? '#0b0b0b' : '#dcdcd8', toggle: () => this.setState(x => ({ chans: { ...x.chans, [k]: !x.chans[k] } })) })),
      // priority
      oneDraft: s.oneDraft, onOneInput: e => this.setState({ oneDraft: e.target.value }),
      oneSugg: ONE_SUGG.map(o => { const sel = !s.oneDraft && s.one === o; return { label: tt(o), bd: sel ? '#0b0b0b' : '#e4e4e0', bg: sel ? '#f4f4f1' : '#fff', mark: sel ? this.ic('check', 16) : null, pick: () => this.setState({ one: o, oneDraft: '' }) }; }),
      minOpts: [25, 45, 90].map(m => ({ label: String(m), bg: s.mins === m ? '#0b0b0b' : '#fff', fg: s.mins === m ? '#fff' : '#0b0b0b', pick: () => this.setState({ mins: m, remaining: m * 60 }) })),
      setOne: () => { const d = s.oneDraft.trim(); this.setState({ one: d ? { en: d, ar: d } : s.one, oneDraft: '', remaining: s.mins * 60, oneDone: false, running: false, screen: 'home' }); },
      // home
      oneTitle: tt(s.one), focusMeta: this.fmt(L.focusMeta, { n: s.mins }), oneDone: s.oneDone, oneOpen: !s.oneDone,
      lockIn: () => this.setState({ screen: 'focus', running: true }),
      tasks: s.tasks.map(taskView),
      waitingSub: this.fmt(L.waitingSub, { n: s.fus.filter(f => f.status !== 'done').length }),
      goFollowups: () => this.go('followups'), goReview: () => this.go('review'), goChat: () => this.go('chat'), goHome: () => this.go('home'), goPriority: () => this.go('priority'),
      capFromHome: () => this.startCapture('home'),
      // focus
      timeLeft: fmtTime(s.remaining), ring, running: s.running, paused: !s.running,
      togglePause: () => this.setState({ running: !s.running }),
      resumeL: (lang === 'ar' ? 'كمّل · باقي ' : 'Resume · ') + fmtTime(s.remaining) + (lang === 'ar' ? '' : ' left'),
      finishFocus: () => { const early = s.remaining > 0 && s.remaining < s.mins * 60 - 1; if (early && !window.confirm(lang === 'ar' ? 'تنهي الجلسة بدري؟ باقي ' + fmtTime(s.remaining) + '.' : 'End the session early? ' + fmtTime(s.remaining) + ' still left.')) return; this.setState({ running: false, oneDone: true, screen: 'home' }); this.toast(L.toastDone); },
      fSafe: this.fmt(L.f_safe, { n: open }), capFromFocus: () => this.startCapture('focus'),
      // capture
      capIdle: s.capState === 'idle', capListening: s.capState === 'listening', capDone: s.capState === 'done', pulse, bars,
      capText: s.capText, onCapInput: e => this.setState({ capText: e.target.value }),
      micTap: () => {
        if (s.capState === 'listening') { clearTimeout(this.capT); this.setState({ capState: 'done', capText: L.cap_sample }); return; }
        this.setState({ capState: 'listening' });
        this.capT = setTimeout(() => this.setState({ capState: 'done', capText: L.cap_sample }), 2600);
      },
      parsedRows: (() => { const p = s.capText ? this.parse(s.capText, L) : parsed; return [[L.what, p.what], [L.who, p.who], [L.when, p.day + ' · ' + p.time], [L.via, L.types[p.type]]].map(([k, v]) => ({ k, v })); })(),
      capTypeSubmit: () => { if (s.capText.trim()) this.setState({ capState: 'done' }); },
      capSave: () => { this.addTask(this.parse(s.capText || L.cap_sample, L)); this.setState({ screen: s.capFrom === 'focus' ? 'focus' : 'home', capState: 'idle', capText: '' }); this.toast(L.toastSaved); },
      capClose: () => this.setState({ screen: s.capFrom === 'focus' ? 'focus' : 'home', capState: 'idle' }),
      // compose
      c: { ...taskView(ct), goal: tt(ct.goal), points: tt(ct.points).map(p => ({ p })), draft, hasDraft: ct.type === 'email' || ct.type === 'whatsapp', isCall: ct.type === 'call', isReminder: ct.type === 'reminder', isEmail: ct.type === 'email', isWa: ct.type === 'whatsapp' },
      onDraft: e => this.setState({ composeDraft: e.target.value }),
      handoff: () => { this.toast(this.fmt(L.toastHand, { app: appName }), false); setTimeout(() => this.setState({ afterSend: true }), 900); },
      callNow: () => { this.toast(lang === 'ar' ? 'نتصل…' : 'Calling…', false); setTimeout(() => this.setState({ afterSend: true }), 900); },
      afterSend: s.afterSend, notSentL: lang === 'ar' ? 'لا، ما أرسلتها لسا' : 'No, I didn’t send it yet', notSent: () => { this.setState({ afterSend: false }); this.toast(lang === 'ar' ? 'تمام، المسودة محفوظة.' : 'Okay — the draft is saved. Still on your list.', false); },
      fuOpts: L.fuOpts.map((w, i) => ({ w, pick: () => {
        this.markDone(ct.id);
        if (i < 3) { this.setState(x => ({ fus: [{ id: 'f' + Date.now(), status: 'waiting', ch: ct.type === 'reminder' ? 'call' : ct.type, en: { who: ct.en.who, what: ct.en.title, since: 'Sent today · follow up ' + C.en.fuOpts[i].toLowerCase() }, ar: { who: ct.ar.who, what: ct.ar.title, since: 'أرسلتها اليوم · تابع ' + C.ar.fuOpts[i] } }, ...x.fus] })); this.toast(this.fmt(L.toastFu, { w })); }
        else this.toast(L.toastDone);
        this.setState({ afterSend: false, screen: 'home' });
      } })),
      // followups
      fus: fuView,
      // notification
      hasNotif: !!nt, n: nt ? { title: tt(nt).title, who: tt(nt).who, time: nt.time, type: L.types[nt.type], bg: TYPE_COL[nt.type].fg } : { title: '', who: '', time: '', type: '', bg: '#0b0b0b' },
      nOpen: () => nt && this.openCompose(nt.id),
      nDone: () => { this.markDone(nt.id); this.setState({ notif: null }); this.toast(L.toastDone); },
      nSnooze: () => { this.setState({ notif: null }); this.toast(L.toastSnooze, false); },
      nLater: () => this.setState({ notif: null, resched: nt && nt.id }),
      // chat
      msgs: s.msgs.map((m, i) => ({
        me: m.from === 'me', bot: m.from === 'bot', text: m.text || this.fmt(L[m.key] || '', { t: m.t || '' }),
        hasCard: !!m.card, card: m.card ? { what: m.card.what, who: m.card.who, when: m.card.day + ' · ' + m.card.time, type: L.types[m.card.type], icon: this.ic(TYPE_ICON[m.card.type], 18, TYPE_COL[m.card.type].fg, 1.9), tc: TYPE_COL[m.card.type].fg } : null,
        pending: !!m.card && !m.confirmed, confirmed: !!m.confirmed, confirm: () => this.confirmCard(m),
        plan: !!m.plan, fu: !!m.fu,
      })),
      plan, chips: L.chips.map(c => ({ c, send: () => this.sendChat(c) })),
      chatInput: s.chatInput, onChatInput: e => this.setState({ chatInput: e.target.value }),
      onChatKey: e => { if (e.key === 'Enter') this.sendChat(); }, sendChat: () => this.sendChat(),
      // review
      rvTasks: rvTasks.filter((r, i) => !s.tasks[i].done && !s.tasks[i].when).slice(0, s.rvAll ? 99 : 4),
      rvMore: !s.rvAll && rvTasks.filter((r, i) => !s.tasks[i].done && !s.tasks[i].when).length > 4,
      rvMoreL: lang === 'ar' ? 'عرض الكل' : 'Show all', rvShowAll: () => this.setState({ rvAll: true }),
      rvAllTmw: () => { const ids = s.tasks.filter(t => !t.done && !s.review[t.id]).map(t => t.id); this.setState(x => ({ review: { ...x.review, ...Object.fromEntries(ids.map(id => [id, 'tmw'])) } })); },
      rvAllTmwL: lang === 'ar' ? 'الباقي لبكرة' : 'Rest → tomorrow',
      rvSum: this.fmt(L.rv_sum, { a: keptN, b: s.tasks.length }),
      yesBg: s.oneDone ? '#0b0b0b' : '#fff', yesFg: s.oneDone ? '#fff' : '#0b0b0b', noBg: !s.oneDone ? '#0b0b0b' : '#fff', noFg: !s.oneDone ? '#fff' : '#0b0b0b',
      setYes: () => this.setState({ oneDone: true }), setNo: () => this.setState({ oneDone: false }),
      closed: s.closed, notClosed: !s.closed,
      closeDay: () => this.setState({ closed: true }), reopen: () => this.setState({ closed: false, step: 0, screen: 'priority', review: {}, oneDone: false }),
      // toast
      hasToast: !!s.toast, toast: s.toast ? s.toast.msg : '', toastUndo: !!(s.toast && s.toast.undo && this.snap),
      undo: () => { if (this.snap) this.setState({ ...this.snap, toast: null }); this.snap = null; },
    };
  }
}
