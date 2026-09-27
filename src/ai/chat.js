/* ============================================================
   PSDKIT AI chat — floating assistant (bottom right).
   Prefers /api/ai when a key is configured on Vercel and falls back
   to the local knowledge engine instantly.
   ============================================================ */
import { el, miniMarkdown, prefersReducedMotion, trapFocus, uid, sleep } from '../ui.js';
import { icon } from '../icons.js';
import { localAnswer, siteIndexForPrompt } from './brain.js';
import { getAiFeedback, saveAiFeedback } from '../prefs.js';
import { t } from '../data/i18n.js';
import { TOOL_COUNT } from '../data/catalog.js';

const CONV_KEY = 'psdkit_ai_conversations';
const LEGACY_KEY = 'psdkit_ai_history';

const QUICK_CHIPS = [
  'Compress a PDF',
  'What does API mean?',
  'Help me learn Python',
  'Make a QR code',
  'Convert currency',
  'My internet speed',
  'Publish a tool',
];

function normalizeMessage(msg) {
  return { id: msg.id || uid('msg'), role: msg.role, content: msg.content || '' };
}

function loadConversations() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONV_KEY) || '[]');
    if (Array.isArray(parsed) && parsed.length) return parsed.map((conv) => ({ ...conv, items: (conv.items || []).map(normalizeMessage) })).slice(-5);
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    if (Array.isArray(legacy) && legacy.length) {
      return [{ id: uid('conv'), title: legacy.find((m) => m.role === 'user')?.content?.slice(0, 42) || 'Recent chat', updatedAt: Date.now(), items: legacy.map(normalizeMessage) }];
    }
  } catch {
    /* ignore */
  }
  return [{ id: uid('conv'), title: 'New chat', updatedAt: Date.now(), items: [] }];
}

function saveConversations(conversations) {
  try { localStorage.setItem(CONV_KEY, JSON.stringify(conversations.slice(-5))); } catch { /* ignore */ }
}

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
  let conversations = loadConversations();
  let currentId = conversations[conversations.length - 1]?.id || uid('conv');
  let busy = false;
  let recording = false;
  let currentToolContext = null;
  let stopTrap = null;
  const feedback = getAiFeedback();

  const currentConversation = () => conversations.find((conv) => conv.id === currentId);
  const ensureConversation = () => {
    if (!currentConversation()) {
      const conv = { id: currentId, title: 'New chat', updatedAt: Date.now(), items: [] };
      conversations.push(conv);
      saveConversations(conversations);
    }
    return currentConversation();
  };

  const fab = el('button.ai-fab#ai-fab', { html: `<div class="fab-ico">${icon('sparkles', 21)}</div><div class="fab-txt">Ask PSDKIT AI</div>`, 'aria-label': 'Open AI assistant' });
  const msgsEl = el('div.ai-msgs#ai-msgs');
  const input = el('textarea.ai-input#ai-input', { rows: 1, placeholder: 'Ask anything — tools, words, coding…' });
  const sendBtn = el('button.ai-send#ai-send', { html: icon('send', 18), 'aria-label': 'Send message' });
  const micBtn = el('button.ai-send.ai-mic', { html: icon('mic', 18), 'aria-label': 'Start voice input' });
  const chipsRow = el('div.ai-chips');
  const historyList = el('div.ai-history-list');
  const historyPanel = el('aside.ai-history');

  const panel = el('div.ai-panel#ai-panel',
    el('div.ai-head',
      el('div.a-av', { html: icon('sparkles', 20) }),
      el('div', { style: { flex: 1 } },
        el('div.a-name', { html: 'PSDKIT <span style="color:var(--accent)">AI</span>' }),
        el('div.a-status', { html: '<span class="dot-live"></span> Online · knows every page' }),
      ),
      el('div.row', { style: { gap: '6px' } },
        el('button.icon-btn', { 'aria-label': t('history'), html: icon('layers', 16), onclick: () => historyPanel.classList.toggle('open') }),
        el('button.icon-btn', { 'aria-label': t('newChat'), html: icon('plus', 16), onclick: newChat }),
        el('button.icon-btn', { 'aria-label': 'Close assistant', html: icon('x', 17), onclick: close, style: { width: '34px', height: '34px' } }),
      ),
    ),
    historyPanel,
    msgsEl,
    chipsRow,
    el('div.ai-input-row', input, micBtn, sendBtn),
  );
  historyPanel.append(el('div.row-between', el('div', { style: { fontWeight: 800 }, text: t('history') }), el('button.btn.btn-ghost.btn-sm', { text: t('clearHistory'), onclick: clearHistory })), historyList);

  document.body.append(fab, panel);

  function persist() {
    conversations = conversations.slice(-5);
    saveConversations(conversations);
  }

  function renderHistory() {
    historyList.innerHTML = '';
    conversations.slice().reverse().forEach((conv) => {
      historyList.append(el('button.ai-history-item', {
        class: conv.id === currentId ? 'active' : '',
        onclick: () => { currentId = conv.id; renderAll(); historyPanel.classList.remove('open'); },
      }, el('strong', { text: conv.title || 'New chat' }), el('span', { text: new Date(conv.updatedAt).toLocaleDateString() })));
    });
  }

  function conversationIntro() {
    if (currentToolContext) {
      return `You’re looking at **${currentToolContext.name}**. Ask me how to use it, what it’s good for, or what similar tools exist.`;
    }
    return `Hey! I’m the **PSDKIT AI** — I know all ${TOOL_COUNT} tools and every page of this site. Ask me about tool discovery, tech words, coding help or step-by-step guides.`;
  }

  function messageFeedbackRow(message) {
    if (message.role !== 'assistant') return null;
    return el('div.ai-feedback',
      el('button', {
        class: feedback[message.id] === 'up' ? 'active' : '',
        'aria-label': 'Helpful answer',
        text: '👍',
        onclick: () => { saveAiFeedback(message.id, 'up'); feedback[message.id] = 'up'; renderAll(); },
      }),
      el('button', {
        class: feedback[message.id] === 'down' ? 'active' : '',
        'aria-label': 'Unhelpful answer',
        text: '👎',
        onclick: () => { saveAiFeedback(message.id, 'down'); feedback[message.id] = 'down'; renderAll(); },
      }),
    );
  }

  function bindInternalLinks(node) {
    node.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = a.getAttribute('href');
        if (target && target.length > 1) {
          if (window.innerWidth < 560) close();
          location.hash = target;
        }
      });
    });
  }

  async function typeReply(bubble, content) {
    if (prefersReducedMotion()) {
      bubble.innerHTML = miniMarkdown(content);
      bindInternalLinks(bubble);
      return;
    }
    const parts = content.split(/(\s+)/);
    let built = '';
    for (const part of parts) {
      built += part;
      bubble.innerHTML = miniMarkdown(built);
      bindInternalLinks(bubble);
      await sleep(part.trim() ? 12 : 0);
    }
  }

  function renderMsg(message, { animate = false } = {}) {
    const wrap = el('div.ai-msg', { class: message.role === 'user' ? 'me' : 'bot' });
    wrap.append(el('div.mav.m-av', { text: message.role === 'user' ? 'You' : 'AI', style: { fontSize: '9.5px' } }));
    const bubble = el('div.ai-bubble');
    if (!animate) {
      bubble.innerHTML = miniMarkdown(message.content);
      bindInternalLinks(bubble);
    }
    wrap.append(bubble);
    const feedbackRow = messageFeedbackRow(message);
    if (feedbackRow) wrap.append(feedbackRow);
    msgsEl.append(wrap);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return { wrap, bubble };
  }

  function renderChips() {
    chipsRow.innerHTML = '';
    const prompts = currentToolContext
      ? [`How do I use ${currentToolContext.name}?`, `Alternatives to ${currentToolContext.name}?`, `Tips for ${currentToolContext.name}`]
      : QUICK_CHIPS;
    prompts.forEach((label) => chipsRow.append(el('button.ai-chip', { text: label, onclick: () => submit(label) })));
  }

  function renderAll() {
    const conv = ensureConversation();
    msgsEl.innerHTML = '';
    if (!conv.items.length) {
      renderMsg({ id: 'intro', role: 'assistant', content: conversationIntro() });
    } else {
      conv.items.forEach((msg) => renderMsg(msg));
    }
    renderChips();
    renderHistory();
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

  function autoGrow() {
    input.style.height = 'auto';
    input.style.height = Math.min(110, input.scrollHeight) + 'px';
  }

  async function submit(text) {
    const content = (text ?? input.value).trim();
    if (!content || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = '';
    autoGrow();
    const conv = ensureConversation();
    const userMessage = normalizeMessage({ role: 'user', content });
    conv.items.push(userMessage);
    conv.title = conv.items.find((m) => m.role === 'user')?.content?.slice(0, 42) || 'New chat';
    conv.updatedAt = Date.now();
    persist();
    renderMsg(userMessage);
    const typing = showTyping();

    const history = conv.items.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    const minDelay = sleep(240 + Math.random() * 260);
    const [serverReply] = await Promise.all([askServer(history), minDelay]);
    const reply = serverReply || localAnswer(content);
    await minDelay;

    typing.remove();
    const assistantMessage = normalizeMessage({ role: 'assistant', content: reply });
    conv.items.push(assistantMessage);
    conv.updatedAt = Date.now();
    persist();
    const { bubble } = renderMsg(assistantMessage, { animate: true });
    await typeReply(bubble, reply);
    renderHistory();
    busy = false;
    sendBtn.disabled = false;
    input.focus({ preventScroll: true });
  }

  function newChat() {
    currentId = uid('conv');
    conversations.push({ id: currentId, title: 'New chat', updatedAt: Date.now(), items: [] });
    persist();
    renderAll();
    input.focus({ preventScroll: true });
  }

  function clearHistory() {
    conversations = [{ id: uid('conv'), title: 'New chat', updatedAt: Date.now(), items: [] }];
    currentId = conversations[0].id;
    persist();
    renderAll();
  }

  function startVoiceInput() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      input.focus();
      return;
    }
    if (recording && window.__psdkit_recognition) {
      window.__psdkit_recognition.stop();
      return;
    }
    const recognition = new Recognition();
    window.__psdkit_recognition = recognition;
    recognition.lang = document.documentElement.lang || 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    micBtn.classList.add('recording');
    micBtn.setAttribute('aria-label', 'Stop voice input');
    recording = true;
    recognition.onresult = (event) => {
      const transcript = [...event.results].map((result) => result[0].transcript).join(' ');
      input.value = transcript;
      autoGrow();
    };
    recognition.onend = () => {
      recording = false;
      micBtn.classList.remove('recording');
      micBtn.setAttribute('aria-label', 'Start voice input');
    };
    recognition.start();
  }

  function open(prefill) {
    panel.classList.add('open');
    fab.style.opacity = '0';
    fab.style.pointerEvents = 'none';
    historyPanel.classList.remove('open');
    renderAll();
    stopTrap?.();
    stopTrap = trapFocus(panel, { onEscape: close });
    if (prefill) {
      input.value = prefill;
      autoGrow();
      setTimeout(() => submit(prefill), 80);
    } else {
      setTimeout(() => input.focus({ preventScroll: true }), 120);
    }
  }

  function close() {
    panel.classList.remove('open');
    fab.style.opacity = '';
    fab.style.pointerEvents = '';
    historyPanel.classList.remove('open');
    stopTrap?.();
  }

  input.addEventListener('input', autoGrow);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });
  sendBtn.addEventListener('click', () => submit());
  micBtn.addEventListener('click', startVoiceInput);
  fab.addEventListener('click', () => (panel.classList.contains('open') ? close() : open()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });

  renderAll();

  window.PSDKIT_AI = {
    open: (prefill) => open(prefill),
    close,
    setContext(tool) {
      currentToolContext = tool || null;
      renderChips();
      if (panel.classList.contains('open') && !currentConversation()?.items.length) renderAll();
    },
  };

  const checkHash = () => {
    if (location.hash === '#ai') {
      open();
      history.replaceState(null, '', location.pathname + '#/');
    }
  };
  window.addEventListener('hashchange', checkHash);
  checkHash();
}

export { siteIndexForPrompt };
