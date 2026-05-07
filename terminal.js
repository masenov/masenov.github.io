/* =============================================================
   terminal.js — small script for animations and theme toggle.
   Pure vanilla JS, no dependencies.
   ============================================================= */

(function () {
  'use strict';

  /* ---------- Theme toggle (light / dark) ---------- */

  var html = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem('mst-theme'); } catch (e) {}
  if (!stored && window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches) {
    stored = 'dark';
  }
  applyTheme(stored || 'light');

  function applyTheme(name) {
    html.setAttribute('data-theme', name);
    var label = document.getElementById('theme-label');
    if (label) label.textContent = (name === 'dark') ? 'Light' : 'Dark';
    try { localStorage.setItem('mst-theme', name); } catch (e) {}
  }

  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var current = html.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------- Scroll percentage in bottom-right ---------- */
  /* Reads from the right pane on desktop (it's the scroll container)
     and falls back to window scroll on mobile (where panes are stacked). */

  var counter = document.getElementById('scroll-counter');
  var pane    = document.getElementById('pane-right');

  function onScroll() {
    var el, top, max;
    var stacked = window.innerWidth <= 860;
    if (stacked || !pane) {
      el  = document.documentElement;
      top = window.scrollY || el.scrollTop;
      max = (el.scrollHeight - el.clientHeight) || 1;
    } else {
      top = pane.scrollTop;
      max = (pane.scrollHeight - pane.clientHeight) || 1;
    }
    var pct = Math.round(top * 100 / max);
    if (pct < 0) pct = 0; if (pct > 100) pct = 100;
    if (counter) counter.textContent = '[' + pct + '%]';
  }
  if (pane) pane.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Last-updated date in tmux bar ---------- */

  var dateEl = document.getElementById('tmux-date');
  if (dateEl) {
    var d = new Date(document.lastModified || Date.now());
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var stamp = ('0' + d.getDate()).slice(-2) + '-' + months[d.getMonth()] + '-' +
                String(d.getFullYear()).slice(-2);
    dateEl.textContent = 'Last updated ' + stamp;
  }

  /* ---------- Interactive mini-terminal ---------- */

  var term   = document.getElementById('mini-term');
  var buffer = document.getElementById('cmd-buffer');
  if (!term || !buffer) return;

  var SECTIONS = ['experience', 'education', 'skills', 'publications', 'interests'];

  var MAN = {
    help:        'help — list available commands',
    ls:          'ls — list resume sections',
    cd:          'cd <section> — scroll to a section',
    cat:         'cat <section> — print a section to the terminal',
    grep:        'grep <term> — search resume content',
    whoami:      'whoami — short bio',
    date:        'date — current date/time',
    clear:       'clear — clear terminal history',
    theme:       'theme — toggle light/dark',
    cv:          'cv — open CV PDF',
    linkedin:    'linkedin — open LinkedIn',
    scholar:     'scholar — open Google Scholar',
    github:      'github — open GitHub',
    twitter:     'twitter — open Twitter/X',
    email:       'email — open mail composer',
    man:         'man <command> — show help for a command',
    sudo:        'sudo — no.',
    exit:        'exit — there is no escape'
  };

  var COMMANDS = {
    help: function () {
      return 'Available commands:\n' +
             '  ls, cd <section>, cat <section>, grep <term>\n' +
             '  whoami, date, theme, clear, man <command>\n' +
             '  cv, linkedin, scholar, github, twitter, email';
    },
    ls: function () { return SECTIONS.join('  '); },
    cd: function (args) {
      var target = (args[0] || '').toLowerCase();
      if (!target) return 'usage: cd <section>  (try: ' + SECTIONS.join(', ') + ')';
      if (SECTIONS.indexOf(target) === -1) return 'cd: no such section: ' + target;
      var el = document.getElementById('section-' + target);
      if (!el) return 'cd: target not found';
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return null;
    },
    cat: function (args) {
      var target = (args[0] || '').toLowerCase();
      if (!target) return 'usage: cat <section>';
      if (SECTIONS.indexOf(target) === -1) return 'cat: no such section: ' + target;
      var el = document.getElementById('section-' + target);
      if (!el) return 'cat: target not found';
      var text = el.textContent.replace(/\s+/g, ' ').trim();
      if (text.length > 360) text = text.slice(0, 360) + '…';
      return text;
    },
    grep: function (args) {
      var term_ = args.join(' ').trim();
      if (!term_) return 'usage: grep <term>';
      var sections = document.querySelectorAll('.resume-section');
      var matches = [];
      var re;
      try { re = new RegExp(term_.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); }
      catch (err) { return 'grep: invalid pattern'; }
      sections.forEach(function (sec) {
        var name = (sec.id || '').replace(/^section-/, '') || '?';
        sec.querySelectorAll('p, li').forEach(function (node) {
          var t = node.textContent.replace(/\s+/g, ' ').trim();
          if (t && re.test(t)) {
            if (t.length > 140) t = t.slice(0, 140) + '…';
            matches.push(name + ': ' + t);
          }
        });
      });
      if (!matches.length) return 'no matches for: ' + term_;
      var capped = matches.slice(0, 8).join('\n');
      if (matches.length > 8) capped += '\n… ' + (matches.length - 8) + ' more';
      return capped;
    },
    whoami:   function () { return 'martin asenov — senior ml engineer · document intelligence, llm inference, time-series'; },
    date:     function () { return new Date().toString(); },
    sudo:     function () { return 'permission denied: nice try'; },
    exit:     function () { return "you can't leave that easily"; },
    man: function (args) {
      var cmd = (args[0] || '').toLowerCase();
      if (!cmd) return 'usage: man <command>';
      return MAN[cmd] || 'no manual entry for ' + cmd;
    },
    clear:    function () { clearTerm(); return null; },
    cv:       function () { open('files/MartinAsenovCV.pdf'); return 'opening CV…'; },
    linkedin: function () { open('https://www.linkedin.com/in/masenov1'); return 'opening linkedin…'; },
    scholar:  function () { open('https://scholar.google.co.uk/citations?user=zFULG8IAAAAJ'); return 'opening scholar…'; },
    github:   function () { open('https://github.com/masenov'); return 'opening github…'; },
    twitter:  function () { open('https://twitter.com/masenov1'); return 'opening twitter…'; },
    email:    function () { window.location.href = 'mailto:m.a.asenov@gmail.com'; return 'opening email…'; },
    theme:    function () {
      var current = html.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
      return 'theme: ' + html.getAttribute('data-theme');
    }
  };

  function open(url) { window.open(url, '_blank', 'noopener'); }

  function clearTerm() {
    /* keep the typing line at the end; remove only typed history */
    var typedLines = term.querySelectorAll('.terminal-typed');
    typedLines.forEach(function (n) { n.parentNode.removeChild(n); });
  }

  var SCROLLBACK = 10;
  function emitTyped(html_) {
    var line = document.createElement('h1');
    line.className = 'terminal-typed';
    line.innerHTML = html_;
    /* insert before the typing line (last child) */
    var typingLine = term.querySelector('.terminal-typing');
    term.insertBefore(line, typingLine);

    /* Cap scrollback so the terminal never grows past the pane. */
    var typed = term.querySelectorAll('.terminal-typed');
    var excess = typed.length - SCROLLBACK;
    for (var i = 0; i < excess; i++) {
      typed[i].parentNode.removeChild(typed[i]);
    }
  }

  function emitOutput(text) {
    String(text).split('\n').forEach(function (ln) {
      emitTyped('<span class="output">' + escapeHtml(ln) + '</span>');
    });
  }

  function runCommand(raw) {
    var line = (raw || '').trim();
    if (!line) return;
    emitTyped('<span class="prompt">&gt;&nbsp;</span><span class="command">' + escapeHtml(line) + '</span>');
    var parts = line.split(/\s+/);
    var cmd  = parts[0].toLowerCase();
    var args = parts.slice(1);
    var fn = COMMANDS[cmd];
    var output;
    if (fn) {
      output = fn(args);
    } else {
      output = "command not found: " + cmd + " (try 'help')";
    }
    if (output != null) emitOutput(output);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  /* Tab completion: complete commands at position 0, sections after cd/cat,
     command names after man. */
  function tabComplete(input) {
    var trailingSpace = /\s$/.test(input);
    var parts = input.split(/\s+/);
    if (trailingSpace) parts.push('');
    var lastIdx = parts.length - 1;
    var prefix = parts[lastIdx];
    var pool;
    if (lastIdx === 0) {
      pool = Object.keys(COMMANDS);
    } else if (parts[0] === 'cd' || parts[0] === 'cat') {
      pool = SECTIONS.slice();
    } else if (parts[0] === 'man') {
      pool = Object.keys(MAN);
    } else {
      return { input: input, suggestions: null };
    }
    var matches = pool.filter(function (c) { return c.indexOf(prefix) === 0; });
    if (matches.length === 0) return { input: input, suggestions: null };
    if (matches.length === 1) {
      parts[lastIdx] = matches[0];
      return { input: parts.join(' ') + ' ', suggestions: null };
    }
    /* Multiple: complete the longest common prefix and list options. */
    var lcp = matches.reduce(function (acc, m) {
      var i = 0;
      while (i < acc.length && i < m.length && acc[i] === m[i]) i++;
      return acc.slice(0, i);
    }, matches[0]);
    if (lcp.length > prefix.length) {
      parts[lastIdx] = lcp;
      return { input: parts.join(' '), suggestions: matches };
    }
    return { input: input, suggestions: matches };
  }

  /* Click anywhere in the terminal to focus typing */
  term.addEventListener('click', function () {
    window.focus();
  });

  /* ---------- Key input ---------- */

  var current = '';
  var history = [];
  var historyIdx = -1;       /* -1 = editing fresh line */
  var pendingInput = '';     /* what user had typed before pressing ArrowUp */
  var HISTORY_MAX = 50;

  function setBuffer(v) { current = v; buffer.textContent = v; }

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var rect = term.getBoundingClientRect();
    var visible = rect.bottom > 0 && rect.top < window.innerHeight;
    if (!visible) return;

    if (e.key === 'Enter') {
      if (current.trim() && history[history.length - 1] !== current) {
        history.push(current);
        if (history.length > HISTORY_MAX) history.shift();
      }
      historyIdx = -1;
      pendingInput = '';
      runCommand(current);
      setBuffer('');
      e.preventDefault();
    } else if (e.key === 'Backspace') {
      setBuffer(current.slice(0, -1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      if (!history.length) { e.preventDefault(); return; }
      if (historyIdx === -1) { pendingInput = current; historyIdx = history.length; }
      if (historyIdx > 0) {
        historyIdx -= 1;
        setBuffer(history[historyIdx]);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (historyIdx === -1) { e.preventDefault(); return; }
      if (historyIdx < history.length - 1) {
        historyIdx += 1;
        setBuffer(history[historyIdx]);
      } else {
        historyIdx = -1;
        setBuffer(pendingInput);
        pendingInput = '';
      }
      e.preventDefault();
    } else if (e.key === 'Tab') {
      var res = tabComplete(current);
      if (res.suggestions) {
        emitOutput(res.suggestions.join('  '));
      }
      if (res.input !== current) setBuffer(res.input);
      e.preventDefault();
    } else if (e.key.length === 1) {
      setBuffer(current + e.key);
    }
  });

})();

/* =============================================================
   Single-button mode toggle: [less resume.md] ⇄ [more resume.md].
   Label reflects the *current* view (starts as "less" — compact).
   Clicking flips the mode: expanding reveals collapsed bullets
   and non-lede paragraphs in .roles-compact sections, and swaps
   the publications grouped summary for the full citation list.
   Drives each element's max-height inline from JS using its
   actual scrollHeight, so the transition lands exactly on the
   right size — no overshoot, no snap.
   ============================================================= */
(function () {
  'use strict';
  var btn = document.getElementById('resume-mode');
  if (!btn) return;
  var html = document.documentElement;
  var sections = document.querySelectorAll('.roles-compact');

  var SELECTOR = '.role .role-body > ul, .role .role-body > p:not(.role-lede)';
  var TRANSITION_MS = 380;

  function targets() {
    var out = [];
    sections.forEach(function (section) {
      section.querySelectorAll(SELECTOR).forEach(function (el) { out.push(el); });
    });
    return out;
  }

  function updateLabel(expanded) {
    btn.textContent = expanded ? '[more resume.md]' : '[less resume.md]';
    btn.setAttribute('aria-pressed', expanded ? 'true' : 'false');
  }

  btn.addEventListener('click', function () {
    var expand = !html.classList.contains('roles-expanded');
    updateLabel(expand);

    var els = targets();

    if (expand) {
      /* Lock current (collapsed) state inline so the browser has a definite
         "from" value, then add the class and animate to the natural height. */
      els.forEach(function (el) { el.style.maxHeight = '0px'; });
      html.classList.add('roles-expanded');
      void document.body.offsetHeight; /* flush layout so the 0px is registered */
      requestAnimationFrame(function () {
        els.forEach(function (el) {
          el.style.maxHeight = el.scrollHeight + 'px';
        });
      });
    } else {
      /* Lock current expanded height inline first, drop the class, then
         animate to zero. */
      els.forEach(function (el) {
        el.style.maxHeight = el.scrollHeight + 'px';
      });
      html.classList.remove('roles-expanded');
      void document.body.offsetHeight;
      requestAnimationFrame(function () {
        els.forEach(function (el) { el.style.maxHeight = '0px'; });
      });
    }

    /* After the transition, clear inline so CSS controls the resting state
       (and content can grow naturally if it changes later). */
    setTimeout(function () {
      els.forEach(function (el) { el.style.maxHeight = ''; });
    }, TRANSITION_MS);
  });
})();
