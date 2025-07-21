//
// MI$TA'S CORE SCRIPT v2.0
// ARCHITECT: PEPETHEFROG
// AGENT: M. MISTARENKO
// STATUS: REBUILT & ENHANCED
//

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- INITIALIZATION ---
const SUPABASE_URL = 'https://ktragdmkrdhuhwohfczz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmJhcmVzZSIsInJlZiI6Imt0cmFnZG1rcmRodWh3b2hmY3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MzMzODEsImV4cCI6MjA2ODUwOTM4MX0.NKgEci1-5rJkOF6DTsAL3u9gVFC80va-Uy9z-UU09jk';
const BACKEND_URL = 'https://mista-backend.onrender.com';

let supabase;
try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.error("FATAL: Supabase client failed to initialize.", e);
    // If Supabase fails, the site is crippled. We can show a message or just log it.
}


// --- DOM ELEMENTS ---
const DOMElements = {
    cursorDot: document.querySelector('.cursor-dot'),
    cursorOutline: document.querySelector('.cursor-outline'),
    matrixCanvas: document.getElementById('matrix-bg'),
    glitchTitle: document.querySelector('.glitch-layers'),
    // Chat
    chatIcon: document.getElementById('chatIcon'),
    chatWindow: document.getElementById('chatWindow'),
    closeChatBtn: document.getElementById('closeChatBtn'),
    chatBody: document.getElementById('chatBody'),
    chatInput: document.getElementById('chatInput'),
    sendChatBtn: document.getElementById('sendChatBtn'),
    usernamePrompt: document.getElementById('usernamePrompt'),
    usernameInput: document.getElementById('usernameInput'),
    saveUsernameBtn: document.getElementById('saveUsernameBtn'),
    activeUsersCount: document.getElementById('activeUsersCount'),
    chatInputArea: document.querySelector('.chat-input-area'),
    // News
    newsIcon: document.getElementById('newsIcon'),
    newsWindow: document.getElementById('newsWindow'),
    closeNewsBtn: document.getElementById('closeNewsBtn'),
    newsBody: document.getElementById('newsBody'),
    newsLoading: document.getElementById('newsLoading'),
    newsCountdown: document.getElementById('newsCountdown'),
    // Brainstorm
    brainstormInput: document.getElementById('brainstormInput'),
    generateIdeaBtn: document.getElementById('generateIdeaBtn'),
    brainstormOutput: document.getElementById('brainstormOutput')
};

// --- STATE MANAGEMENT ---
const AppState = {
    username: localStorage.getItem('mista_chat_username'),
    userId: localStorage.getItem('mista_chat_userid'),
    supabaseChannel: null,
    lastMessageTimestamp: new Date(0),
    newsUpdateTimer: null,
    runes: ['ᛗ', 'ᛁ', 'ᛊ', 'ᛏ', 'ᚨ', 'ᚱ', 'ᛖ', 'ᚾ', 'ᚲ', 'ᛟ', 'ᚠ', 'ᚢ', 'ᚦ', 'ᚩ', 'ᚱ', 'ᚳ', 'ᚷ', 'ᚹ', 'ᚻ', 'ᚾ', 'ᛁ', 'ᛄ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛝ', 'ᛟ', 'ᛞ'],
    typingAnimationInterval: null
};


// --- MODULE: NEO CURSOR ---
function initCursor() {
    if (!DOMElements.cursorDot || !DOMElements.cursorOutline) return;
    window.addEventListener('mousemove', (e) => {
        const { clientX: posX, clientY: posY } = e;
        DOMElements.cursorDot.style.left = `${posX}px`;
        DOMElements.cursorDot.style.top = `${posY}px`;
        DOMElements.cursorOutline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 500, fill: 'forwards' });
    });
}

// --- MODULE: MATRIX BACKGROUND ---
function initMatrix() {
    const canvas = DOMElements.matrixCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const letters = 'M1$TДR3ИK0'.split('');
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops = Array.from({ length: columns }).fill(1);

    function drawMatrix() {
        ctx.fillStyle = 'rgba(1, 4, 9, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(57, 255, 20, 0.5)'; // Brighter green
        ctx.font = `${fontSize}px monospace`;

        for (let i = 0; i < drops.length; i++) {
            const text = letters[Math.floor(Math.random() * letters.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    setInterval(drawMatrix, 45);
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// --- MODULE: RUNE HOVER EFFECT ---
function initRuneHover() {
    const title = DOMElements.glitchTitle;
    if (!title) return;

    const originalText = title.textContent.trim();
    const layers = title.querySelectorAll('span');
    
    // We only need to work with the base text layer
    const baseLayer = document.createElement('h1');
    baseLayer.className = 'glitch-layers';
    
    originalText.split('').forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.dataset.originalChar = char;
        span.classList.add('interactive-hover');
        span.addEventListener('mouseover', () => {
            span.textContent = AppState.runes[Math.floor(Math.random() * AppState.runes.length)];
            span.style.color = 'var(--neon-green)';
            span.style.textShadow = '0 0 10px var(--neon-green)';
        });
        span.addEventListener('mouseout', () => {
            span.textContent = span.dataset.originalChar;
            span.style.color = '';
            span.style.textShadow = '';
        });
        baseLayer.appendChild(span);
    });

    // Replace original h1 with the new one + the glitch layers
    title.innerHTML = '';
    title.appendChild(baseLayer);
    layers.forEach(layer => title.appendChild(layer.cloneNode(true)));
}


// --- MODULE: CHAT ---
function initChat() {
    if (!supabase || !DOMElements.chatIcon) return;

    const setupChatUI = () => {
        DOMElements.usernamePrompt.style.display = 'none';
        DOMElements.chatBody.style.display = 'flex';
        DOMElements.chatInputArea.style.display = 'flex';
        loadInitialMessages();
        initializeSupabaseChannel();
    };

    if (AppState.username && AppState.userId) {
        setupChatUI();
    }

    DOMElements.chatIcon.addEventListener('click', () => DOMElements.chatWindow.classList.toggle('active'));
    DOMElements.closeChatBtn.addEventListener('click', () => DOMElements.chatWindow.classList.remove('active'));
    DOMElements.sendChatBtn.addEventListener('click', sendMessage);
    DOMElements.chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

    DOMElements.saveUsernameBtn.addEventListener('click', () => {
        const username = DOMElements.usernameInput.value.trim();
        if (username) {
            AppState.username = username;
            AppState.userId = 'user_' + Date.now() + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('mista_chat_username', AppState.username);
            localStorage.setItem('mista_chat_userid', AppState.userId);
            setupChatUI();
        }
    });
}

function displayChatMessage(username, message, isMe) {
    if (!message || typeof message !== 'string') return;
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-message', isMe ? 'self' : 'other');
    msgDiv.innerHTML = `<span class="username">${username || 'Невідомий'}</span><p>${message.replace(/\n/g, '<br>')}</p>`;
    DOMElements.chatBody.appendChild(msgDiv);
    DOMElements.chatBody.scrollTop = DOMElements.chatBody.scrollHeight;
}

async function loadInitialMessages() {
    if (!AppState.userId) return;
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(100);
    if (error) { console.error("History load error:", error); return; }
    
    DOMElements.chatBody.innerHTML = '';
    data.forEach(msg => {
        displayChatMessage(msg.username, msg.message, msg.user_id === AppState.userId);
        const msgDate = new Date(msg.created_at);
        if (msgDate > AppState.lastMessageTimestamp) AppState.lastMessageTimestamp = msgDate;
    });
}

function initializeSupabaseChannel() {
    if (AppState.username && !AppState.supabaseChannel) {
        AppState.supabaseChannel = supabase.channel(`mista-throne-room`, {
            config: { presence: { key: AppState.username } }
        });
        listenForMessages();
    }
}

function listenForMessages() {
    AppState.supabaseChannel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const newMessage = payload.new;
            // Check if message is new and not from the current user to avoid duplication
            if (new Date(newMessage.created_at) > AppState.lastMessageTimestamp && newMessage.user_id !== AppState.userId) {
                // If Mista is responding, stop the typing animation
                if (newMessage.username === 'MI$TA') {
                    stopTypingAnimation();
                }
                displayChatMessage(newMessage.username, newMessage.message, false);
                AppState.lastMessageTimestamp = new Date(newMessage.created_at);
            }
        })
        .on('presence', { event: 'sync' }, () => {
            const state = AppState.supabaseChannel.presenceState();
            const count = Object.keys(state).length;
            DOMElements.activeUsersCount.textContent = `В мережі: ${count}`;
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await AppState.supabaseChannel.track({ online_at: new Date().toISOString() });
            }
        });
}

function startTypingAnimation() {
    stopTypingAnimation(); // Clear any existing animation

    const indicatorDiv = document.createElement('div');
    indicatorDiv.id = 'mista-typing-indicator';
    indicatorDiv.classList.add('chat-message', 'other');
    indicatorDiv.innerHTML = `
        <span class="username">MI$TA</span>
        <div class="rune-symbols">
            <span class="rune-char">.</span>
            <span class="rune-char">.</span>
            <span class="rune-char">.</span>
        </div>
    `;
    DOMElements.chatBody.appendChild(indicatorDiv);
    DOMElements.chatBody.scrollTop = DOMElements.chatBody.scrollHeight;

    const runeChars = indicatorDiv.querySelectorAll('.rune-char');
    AppState.typingAnimationInterval = setInterval(() => {
        runeChars.forEach(char => {
            char.textContent = AppState.runes[Math.floor(Math.random() * AppState.runes.length)];
        });
    }, 100);
}

function stopTypingAnimation() {
    clearInterval(AppState.typingAnimationInterval);
    const indicator = document.getElementById('mista-typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

async function sendMessage() {
    const messageText = DOMElements.chatInput.value.trim();
    if (!messageText || !AppState.username) return;

    displayChatMessage(AppState.username, messageText, true);
    DOMElements.chatInput.value = '';
    startTypingAnimation();

    try {
        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: messageText, user_id: AppState.userId, username: AppState.username })
        });
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        // The backend now saves the message and the realtime listener will display the response.
        // We don't need to do anything with the response here.
    } catch (err) {
        console.error("Send message error:", err);
        stopTypingAnimation();
        displayChatMessage('MI$TA', 'Мережевий шторм. Не можу достукатися до свого мозку. Спробуй пізніше.', false);
    }
}


// --- MODULE: NEWS ---
function initNews() {
    if (!DOMElements.newsIcon) return;
    const NEWS_REFRESH_INTERVAL = 10 * 60 * 60 * 1000; // 10 hours

    const updateNewsView = () => {
        const cachedNews = localStorage.getItem('mista_news_cache');
        const lastFetchTime = parseInt(localStorage.getItem('mista_news_last_fetch'), 10);
        const now = Date.now();

        if (cachedNews && lastFetchTime && (now - lastFetchTime < NEWS_REFRESH_INTERVAL)) {
            DOMElements.newsLoading.style.display = 'none';
            displayNews(JSON.parse(cachedNews));
        } else {
            fetchNews();
        }
        startNewsCountdown(NEWS_REFRESH_INTERVAL);
    };

    DOMElements.newsIcon.addEventListener('click', () => {
        const isActive = DOMElements.newsWindow.classList.toggle('active');
        if (isActive) updateNewsView();
        else clearInterval(AppState.newsUpdateTimer);
    });

    DOMElements.closeNewsBtn.addEventListener('click', () => {
        DOMElements.newsWindow.classList.remove('active');
        clearInterval(AppState.newsUpdateTimer);
    });
}

function displayNews(newsItems) {
    DOMElements.newsBody.innerHTML = '';
    if (!newsItems || newsItems.length === 0) {
        DOMElements.newsBody.innerHTML = '<p class="news-loading">Сигнали відсутні. Інфопростір чистий.</p>';
        return;
    }
    newsItems.forEach(news => {
        const item = document.createElement('div');
        item.className = 'news-item';
        item.innerHTML = `
            <h4>${news.title}</h4>
            <p>${news.description}</p>
            <a href="${news.link}" target="_blank" class="interactive-hover">Джерело <i class="fas fa-external-link-alt"></i></a>
        `;
        DOMElements.newsBody.appendChild(item);
    });
}

function startNewsCountdown(interval) {
    clearInterval(AppState.newsUpdateTimer);
    AppState.newsUpdateTimer = setInterval(() => {
        const lastFetchTime = parseInt(localStorage.getItem('mista_news_last_fetch'), 10);
        if (!lastFetchTime) {
            DOMElements.newsCountdown.textContent = 'Оновлення...';
            return;
        }
        const timeRemaining = (lastFetchTime + interval) - Date.now();
        if (timeRemaining <= 0) {
            DOMElements.newsCountdown.textContent = 'Готово до оновлення';
            clearInterval(AppState.newsUpdateTimer);
            return;
        }
        const h = Math.floor(timeRemaining / 3600000);
        const m = Math.floor((timeRemaining % 3600000) / 60000);
        const s = Math.floor((timeRemaining % 60000) / 1000);
        DOMElements.newsCountdown.textContent = `Оновлення через: ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, 1000);
}

async function fetchNews() {
    DOMElements.newsLoading.style.display = 'block';
    DOMElements.newsBody.innerHTML = '';
    try {
        const response = await fetch(`${BACKEND_URL}/news`, { method: 'POST' });
        if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
        const newsItems = await response.json();
        DOMElements.newsLoading.style.display = 'none';
        displayNews(newsItems);
        localStorage.setItem('mista_news_cache', JSON.stringify(newsItems));
        localStorage.setItem('mista_news_last_fetch', Date.now().toString());
    } catch (error) {
        console.error("Failed to fetch news:", error);
        DOMElements.newsLoading.style.display = 'none';
        DOMElements.newsBody.innerHTML = '<p class="news-loading">Помилка каналу новин.</p>';
    }
}

// --- MODULE: BRAINSTORM ---
function initBrainstorm() {
    if (!DOMElements.generateIdeaBtn) return;

    DOMElements.generateIdeaBtn.addEventListener('click', async () => {
        const prompt = DOMElements.brainstormInput.value.trim();
        if (!prompt) {
            DOMElements.brainstormOutput.textContent = "Порожнеча не надихає. Введіть концепцію.";
            return;
        }
        DOMElements.brainstormOutput.textContent = "Підключаюся до ноосфери...";
        DOMElements.brainstormOutput.classList.add('loading');
        DOMElements.generateIdeaBtn.disabled = true;

        try {
            const response = await fetch(`${BACKEND_URL}/brainstorm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const data = await response.json();
            DOMElements.brainstormOutput.textContent = data.response;
        } catch (error) {
            console.error("Brainstorm error:", error);
            DOMElements.brainstormOutput.textContent = "Помилка генерації. Схоже, ідеї сьогодні страйкують.";
        } finally {
            DOMElements.brainstormOutput.classList.remove('loading');
            DOMElements.generateIdeaBtn.disabled = false;
        }
    });
}


// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("M.I.S.T.A. consciousness initializing...");
    initCursor();
    initMatrix();
    initRuneHover();
    initChat();
    initNews();
    initBrainstorm();
    console.log("System online. Welcome, Architect.");
});