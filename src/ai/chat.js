/* ============================================================
   PSDKIT AI chat — floating assistant (bottom right).
   Prefers the /api/ai endpoint (LLM when a key is configured on
   Vercel), falls back to the local knowledge engine instantly.
   ============================================================ */
import { el, miniMarkdown, debounce } from '../ui.js';
import { icon } from '../icons.js';
import { localAnswer, siteIndexForPrompt } from './brain.js';

const HISTORY_KEY = 'psdkit_ai_history';

const QUICK_CHIPS = [
  'Compress a PDF',
  'What does API mean?',
  'Help me learn Python',
  'Make a QR code',
  'Convert currency',
  'My internet speed',
  'Publish a tool',
];

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').slice(-16);
  } catch {
    return [];
  }
}

function saveHistory(msgs) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-16)));
  } catch { /* storage full */ }
}

/** Try the server LLM endpoint; return null if unavailable → local engine */
async function askServer(messages) {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.reply === 'string' && data.reply.trim()) return data.reply.trim();
    return null;
  } catch {
    return null;
  }
}

export function initChat() {
  let messages = loadHistory();
  let busy = false;

  /* ---------- DOM ---------- */
  const fab = el('button.ai-fab#ai-fab', {
    html: `<div class="fab-ico">${icon('sparkles', 21)}</div><div class="fab-txt">Ask PSDKIT AI</div>`,
    'aria-label': 'Open AI assistant',
  });

  const msgsEl = el('div.ai-msgs#ai-msgs');
  const input = el('textarea.ai-input#ai-input', {
    rows: 1, placeholder: 'Ask anything — tools, words, coding…',
  });
  const sendBtn = el('button.ai-send#ai-send', { html: icon('send', 18), 'aria-label': 'Send message' });

  const chipsRow = el('div.ai-chips', ...QUICK_CHIPS.map((c) =>
    el('button.ai-chip', { text: c, onclick: () => submit(c) })));

  const panel = el('div.ai-panel#ai-panel',
    el('div.ai-head',
      el('div.a-av', { html: icon('sparkles', 20) }),
      el('div', { style: { flex: 1 } },
        el('div.a-name', { html: 'PSDKIT <span style="color:var(--accent)">AI</span>' }),
        el('div.a-status', { html: '<span class="dot-live"></span> Online · knows every page' }),
      ),
      el('button.modal-close', {
        html: icon('x', 17),
        onclick: close,
        'aria-label': 'Close assistant',
        style: { width: '34px', height: '34px' },
      }),
    ),
    msgsEl,
    chipsRow,
    el('div.ai-input-row',
      input,
      sendBtn,
    ),
  );

  document.body.append(fab, panel);

  /* ---------- Rendering ---------- */
  function renderMsg(role, content) {
    const wrap = el('div.ai-msg', { class: role === 'user' ? 'me' : 'bot' });
    wrap.append(el('div.mav.m-av', { text: role === 'user' ? 'You' : 'AI', style: { fontSize: '9.5px' } }));
    const bubble = el('div.ai-bubble', { html: miniMarkdown(content) });
    // internal hash links → navigate & keep panel open on desktop
    bubble.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = a.getAttribute('href');
        if (target && target.length > 1) {
          if (window.innerWidth < 560) close();
          location.hash = target;
        }
      });
    });
    wrap.append(bubble);
    msgsEl.append(wrap);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return wrap;
  }

  function renderAll() {
    msgsEl.innerHTML = '';
    if (!messages.length) {
      renderMsg('bot', `Hey! I’m the **PSDKIT AI** — I know all 150 tools and every page of this site.\n\nAsk me things like “compress a PDF”, “what does CORS mean” or “help me learn JavaScript” — and I’ll link you straight there.`);
    } else {
      for (const m of messages) renderMsg(m.role, m.content);
    }
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function showTyping() {
    const t = el('div.ai-msg.bot#typing',
      el('div.m-av', { text: 'AI', style: { fontSize: '9.5px' } }),
      el('div.ai-bubble', el('div.ai-typing', el('span'), el('span'), el('span'))),
    );
    msgsEl.append(t);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return t;
  }

  /* ---------- Flow ---------- */
  async function submit(text) {
    const content = (text ?? input.value).trim();
    if (!content || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = '';
    autoGrow();

    messages.push({ role: 'user', content });
    renderMsg('user', content);
    const typing = showTyping();

    // slight human-feeling delay
    const minDelay = new Promise((r) => setTimeout(r, 350 + Math.random() * 450));

    let reply = null;
    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    const [serverReply] = await Promise.all([askServer(history), minDelay]);

    if (serverReply) {
      reply = serverReply;
    } else {
      reply = localAnswer(content);
      await minDelay;
    }

    typing.remove();
    messages.push({ role: 'assistant', content: reply });
    saveHistory(messages);
    renderMsg('bot', reply);
    busy = false;
    sendBtn.disabled = false;
    input.focus({ preventScroll: true });
  }

  /* ---------- Behaviour ---------- */
  function autoGrow() {
    input.style.height = 'auto';
    input.style.height = Math.min(110, input.scrollHeight) + 'px';
  }
  input.addEventListener('input', autoGrow);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });
  sendBtn.addEventListener('click', () => submit());
  fab.addEventListener('click', () => (panel.classList.contains('open') ? close() : open()));

  function open(prefill) {
    panel.classList.add('open');
    fab.style.opacity = '0';
    fab.style.pointerEvents = 'none';
    renderAll();
    if (prefill) {
      input.value = prefill;
      setTimeout(() => submit(prefill), 120);
    } else {
      setTimeout(() => input.focus({ preventScroll: true }), 220);
    }
  }
  function close() {
    panel.classList.remove('open');
    fab.style.opacity = '';
    fab.style.pointerEvents = '';
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) close();
  });

  renderAll();

  /* Public API for other pages */
  window.PSDKIT_AI = {
    open: (prefill) => open(prefill),
    close,
  };

  /* #ai hash opens the assistant */
  const checkHash = () => {
    if (location.hash === '#ai') {
      open();
      history.replaceState(null, '', location.pathname + '#/');
    }
  };
  window.addEventListener('hashchange', checkHash);
  checkHash();
}

/** Exported for the serverless function to reuse the same index (type-stripped) */
export { siteIndexForPrompt };
