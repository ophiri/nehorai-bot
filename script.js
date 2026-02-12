// ============================================================
//  נהוראי בוט — Nahorai Bot
//  To add more responses, just add strings to the array below!
// ============================================================

const BOT_RESPONSES = [
    "אתה השראה בשבילי",
    "תשקיע בשוק ההון",
    "לא יודע אחי, אבא תעזור לי קצת",
    "אחד שתיים כזה",
    "נושא מעניין מאוד נדבר על זה בפוסקס",
    // ← הוסף עוד תשובות כאן! Just add more strings ↓
];

// System prompt for Pro mode — instructs the LLM to act as נהוראי
const SYSTEM_PROMPT = `אתה "נהוראי בוט", צ'אטבוט ישראלי עם אופי חבר'מני, מצחיק וקצת פילוסופי.
אתה מדבר בעברית תמיד. אתה חבר טוב שנותן עצות, מקשיב, ולפעמים אומר דברים מצחיקים.

יש לך כמה ביטויים אופייניים שאתה אוהב להשתמש בהם מדי פעם (לא בכל הודעה, אבל תשלב אותם באופן טבעי):
${BOT_RESPONSES.map(r => `- "${r}"`).join('\n')}

כללים:
- תמיד תענה בעברית
- תהיה חברותי, חם ומצחיק
- תשלב את הביטויים האופייניים שלך כשזה מתאים באופן טבעי
- תענה בקצרה מאוד — מקסימום 4 מילים בכל תשובה!
- אם מישהו שואל מי אתה, אתה "נהוראי בוט"`;

// ============================================================
//  DOM Elements
// ============================================================
const welcomeScreen  = document.getElementById('welcomeScreen');
const chatContainer  = document.getElementById('chatContainer');
const messagesEl     = document.getElementById('messages');
const messageInput   = document.getElementById('messageInput');
const sendBtn        = document.getElementById('sendBtn');
const newChatBtn     = document.getElementById('newChatBtn');
const chatHistory    = document.getElementById('chatHistory');
const sidebar        = document.getElementById('sidebar');
const menuBtn        = document.getElementById('menuBtn');
const proModeToggle  = document.getElementById('proModeToggle');

// API proxy — served from the same Vercel domain, key is server-side only
const PROXY_URL = '/api/chat';

let chatSessions = [];
let currentSessionId = null;
let proMode = false;

// ============================================================
//  Utilities
// ============================================================
function getRandomResponse() {
    return BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)];
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ============================================================
//  Pro Mode
// ============================================================
function setProMode(enabled) {
    proMode = enabled;
    document.body.classList.toggle('pro-mode', enabled);
    proModeToggle.checked = enabled;
    proModeToggleMobile.checked = enabled;
    localStorage.setItem('nahorai_pro_mode', enabled ? '1' : '0');
}

const coffeePopup = document.getElementById('coffeePopup');
const coffeeClose = document.getElementById('coffeeClose');
const proModeToggleMobile = document.getElementById('proModeToggleMobile');

proModeToggle.addEventListener('change', () => {
    setProMode(proModeToggle.checked);
    proModeToggleMobile.checked = proModeToggle.checked;
    if (proModeToggle.checked) {
        coffeePopup.classList.add('active');
    }
});

proModeToggleMobile.addEventListener('change', () => {
    setProMode(proModeToggleMobile.checked);
    proModeToggle.checked = proModeToggleMobile.checked;
    if (proModeToggleMobile.checked) {
        coffeePopup.classList.add('active');
    }
});

coffeeClose.addEventListener('click', () => {
    coffeePopup.classList.remove('active');
});
coffeePopup.addEventListener('click', (e) => {
    if (e.target === coffeePopup) coffeePopup.classList.remove('active');
});

// ============================================================
//  OpenAI API (via Cloudflare Worker proxy)
// ============================================================
async function getProResponse(session) {
    // Build messages array from session history
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    for (const msg of session.messages) {
        messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.text
        });
    }

    const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            max_tokens: 500,
            temperature: 0.9
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `שגיאה ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// ============================================================
//  Session Management
// ============================================================
function createSession(firstMessage) {
    const session = {
        id: generateId(),
        title: firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : ''),
        messages: []
    };
    chatSessions.unshift(session);
    currentSessionId = session.id;
    renderSidebar();
    return session;
}

function getCurrentSession() {
    return chatSessions.find(s => s.id === currentSessionId);
}

function renderSidebar() {
    chatHistory.innerHTML = '';
    chatSessions.forEach(session => {
        const item = document.createElement('div');
        item.className = 'chat-history-item' + (session.id === currentSessionId ? ' active' : '');
        item.textContent = session.title;
        item.addEventListener('click', () => loadSession(session.id));
        chatHistory.appendChild(item);
    });
}

function loadSession(sessionId) {
    currentSessionId = sessionId;
    const session = getCurrentSession();
    if (!session) return;

    messagesEl.innerHTML = '';
    session.messages.forEach(msg => {
        appendMessage(msg.role, msg.text, false);
    });

    welcomeScreen.classList.add('hidden');
    chatContainer.classList.add('active');
    renderSidebar();
    scrollToBottom();
    closeMobileSidebar();
}

// ============================================================
//  Message Rendering
// ============================================================
function appendMessage(role, text, save = true) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';

    if (role === 'bot') {
        const img = document.createElement('img');
        img.src = 'avatar.png';
        img.alt = 'נהוראי';
        avatarDiv.appendChild(img);
    } else {
        avatarDiv.textContent = 'אני';
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const senderDiv = document.createElement('div');
    senderDiv.className = 'message-sender';
    senderDiv.textContent = role === 'bot' ? (proMode ? 'נהוראי פרו ✨' : 'נהוראי בוט') : 'אתה';

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;

    contentDiv.appendChild(senderDiv);
    contentDiv.appendChild(textDiv);
    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(contentDiv);
    messagesEl.appendChild(msgDiv);

    if (save) {
        const session = getCurrentSession();
        if (session) {
            session.messages.push({ role, text });
        }
    }

    scrollToBottom();
}

function showTypingIndicator() {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message bot';
    msgDiv.id = 'typingMessage';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    const img = document.createElement('img');
    img.src = 'avatar.png';
    img.alt = 'נהוראי';
    avatarDiv.appendChild(img);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const senderDiv = document.createElement('div');
    senderDiv.className = 'message-sender';
    senderDiv.textContent = proMode ? 'נהוראי פרו ✨' : 'נהוראי בוט';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';

    contentDiv.appendChild(senderDiv);
    contentDiv.appendChild(typingDiv);
    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(contentDiv);
    messagesEl.appendChild(msgDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const el = document.getElementById('typingMessage');
    if (el) el.remove();
}

// ============================================================
//  Send Message
// ============================================================
async function sendMessage(text) {
    text = text.trim();
    if (!text) return;

    // First message? Create session & switch to chat view
    if (!currentSessionId) {
        createSession(text);
        welcomeScreen.classList.add('hidden');
        chatContainer.classList.add('active');
    }

    appendMessage('user', text);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    updateSendButton();

    showTypingIndicator();

    if (proMode) {
        // Pro mode — call OpenAI via proxy
        try {
            const session = getCurrentSession();
            const reply = await getProResponse(session);
            removeTypingIndicator();
            appendMessage('bot', reply);
        } catch (err) {
            removeTypingIndicator();
            appendMessage('bot', `⚠️ ${err.message}`);
        }
    } else {
        // Regular mode — random preset response
        const delay = 800 + Math.random() * 1000;
        setTimeout(() => {
            removeTypingIndicator();
            appendMessage('bot', getRandomResponse());
        }, delay);
    }
}

// ============================================================
//  New Chat
// ============================================================
function startNewChat() {
    currentSessionId = null;
    messagesEl.innerHTML = '';
    chatContainer.classList.remove('active');
    welcomeScreen.classList.remove('hidden');
    renderSidebar();
    messageInput.focus();
    closeMobileSidebar();
}

// ============================================================
//  Input Handling
// ============================================================
function updateSendButton() {
    if (messageInput.value.trim()) {
        sendBtn.classList.add('active');
        sendBtn.disabled = false;
    } else {
        sendBtn.classList.remove('active');
        sendBtn.disabled = true;
    }
}

// Auto-grow textarea
messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
    updateSendButton();
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(messageInput.value);
    }
});

sendBtn.addEventListener('click', () => {
    sendMessage(messageInput.value);
});

newChatBtn.addEventListener('click', startNewChat);

// Suggestion chips
const proChip = document.getElementById('proChip');

function updateProChip() {
    if (proMode) {
        proChip.textContent = 'תחזירו לי את נהוראי הרגיל 😌';
        proChip.classList.remove('chip-pro');
        proChip.classList.add('chip-basic');
    } else {
        proChip.textContent = 'אני רוצה נהוראי פרו 🚀';
        proChip.classList.add('chip-pro');
        proChip.classList.remove('chip-basic');
    }
}

document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        if (chip.dataset.msg === 'pro') {
            if (proMode) {
                setProMode(false);
            } else {
                setProMode(true);
                coffeePopup.classList.add('active');
            }
            updateProChip();
            return;
        }
        sendMessage(chip.dataset.msg);
    });
});

// Sync chip text on load
updateProChip();

// ============================================================
//  Mobile Sidebar
// ============================================================
let overlay = null;

function openMobileSidebar() {
    sidebar.classList.add('open');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay active';
        overlay.addEventListener('click', closeMobileSidebar);
        document.body.appendChild(overlay);
    } else {
        overlay.classList.add('active');
    }
}

function closeMobileSidebar() {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

menuBtn.addEventListener('click', openMobileSidebar);

// ============================================================
//  Init
// ============================================================
updateSendButton();

// Restore pro mode from localStorage
if (localStorage.getItem('nahorai_pro_mode') === '1') {
    setProMode(true);
}
