const YOUTUBE_API_KEY = "AIzaSyA22gZKHrsN_6YeMWjoZ6prAW4mMfoW_ig"; 
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";

import { initializeApp } from "firebase/app";
import { 
    getFirestore, collection, addDoc, doc, setDoc, getDoc,
    query, where, orderBy, getDocs 
} from "firebase/firestore";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    signOut, onAuthStateChanged 
} from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCxqC2ZVv-Mr1qIBCYvnOj5L3KbO9RwrUk", 
    authDomain: "emotune-8db65.firebaseapp.com",
    projectId: "emotune-8db65",
    storageBucket: "emotune-8db65.firebasestorage.app",
    messagingSenderId: "448392645543",
    appId: "1:448392645543:web:e191634f04a02d0c2ec482",
    measurementId: "G-VR0EXXF588"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');

const authForm = document.getElementById('auth-form');
const formTitle = document.getElementById('form-title');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('auth-btn');
const toggleLink = document.getElementById('toggle-link');

const logoutBtn = document.getElementById('logout-btn'); 
const sidebarLinks = document.querySelectorAll('.sidebar-nav li'); 
const viewTitle = document.getElementById('view-title'); 
const allViews = document.querySelectorAll('.main-view'); 
const moodLogList = document.getElementById('mood-log-list'); 

const happyPlaylistBtn = document.getElementById('happy-playlist-mode');
const sadPlaylistBtn = document.getElementById('sad-playlist-mode');
const stressedPlaylistBtn = document.getElementById('stressed-playlist-mode');
const focusedPlaylistBtn = document.getElementById('focused-playlist-mode');

const happyQueryBtn = document.getElementById('happy-query-mode');
const sadQueryBtn = document.getElementById('sad-query-mode');
const stressedQueryBtn = document.getElementById('stressed-query-mode');
const focusedQueryBtn = document.getElementById('focused-query-mode');
const queryStep1 = document.getElementById('query-step-1');
const queryStep2 = document.getElementById('query-step-2');
const languageInstruction = document.getElementById('language-instruction');
const langButtons = document.querySelectorAll('.lang-btn');
const cancelQueryBtn = document.getElementById('cancel-query-btn');

const happyPlaylistInput = document.getElementById('happy-playlist');
const sadPlaylistInput = document.getElementById('sad-playlist');
const stressedPlaylistInput = document.getElementById('stressed-playlist');
const focusedPlaylistInput = document.getElementById('focused-playlist');
const savePlaylistsBtn = document.getElementById('save-playlists-btn');

const feedbackText = document.getElementById('feedback-text');
const sendFeedbackBtn = document.getElementById('send-feedback-btn');

let currentUserId = null;
let isLogin = true; 
let pendingQueryMood = null; 

toggleLink.addEventListener('click', (e) => {
    e.preventDefault(); 
    isLogin = !isLogin; 
    if (isLogin) {
        formTitle.textContent = 'Sign In';
        authBtn.textContent = 'Login';
        toggleLink.innerHTML = "Don't have an account? <a href='#'>Create One</a>";
    } else {
        formTitle.textContent = 'Sign Up';
        authBtn.textContent = 'Sign Up';
        toggleLink.innerHTML = "Already have an account? <a href='#'>Sign In</a>";
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) { alert('Please enter both email and password.'); return; }
    try {
        if (isLogin) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
    } catch (error) { console.error('Authentication Error: ', error.message); alert(error.message); }
});

logoutBtn.addEventListener('click', async () => {
    try { await signOut(auth); } catch (error) { console.error('Logout Error: ', error.message); }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        loginContainer.style.display = 'none'; 
        appContainer.style.display = 'flex'; 
        loadUserPlaylists(currentUserId);
        switchView('playlist-view'); 
    } else {
        currentUserId = null;
        loginContainer.style.display = 'block'; 
        appContainer.style.display = 'none';  
        clearPlaylistInputs();
    }
});

sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetViewId = link.getAttribute('data-view');
        if (targetViewId) { switchView(targetViewId); }
    });
});

function switchView(viewId) {
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-view') === viewId) {
            link.classList.add('active');
            const titleSpan = link.querySelector('span');
            if (titleSpan) { viewTitle.textContent = titleSpan.textContent; }
        }
    });

    allViews.forEach(view => view.classList.remove('view-active'));
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('view-active');
        if (viewId === 'query-view') { resetQueryView(); }
        if (viewId === 'history-view' && currentUserId) { loadMoodHistory(currentUserId); }
    }
}

function clearPlaylistInputs() {
    happyPlaylistInput.value = ''; sadPlaylistInput.value = '';
    stressedPlaylistInput.value = ''; focusedPlaylistInput.value = '';
}

function getMoodEmoji(mood) {
    switch (mood) {
        case 'happy': return '😊'; case 'sad': return '😔';
        case 'stressed': return '🥵'; case 'focused': return '🧐';
        default: return '❓';
    }
}

async function loadMoodHistory(userId) {
    if (!moodLogList) return;
    moodLogList.innerHTML = '<p style="text-align: center; color: #999;">Loading history...</p>';
    try {
        const moodsRef = collection(db, "moods");
        const q = query(moodsRef, where("userId", "==", userId), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            moodLogList.innerHTML = '<p style="text-align: center; color: #999;">No moods logged yet.</p>'; return;
        }
        let logHtml = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const mood = data.mood || 'unknown';
            const timestamp = data.timestamp ? data.timestamp.toDate() : new Date(); 
            const mode = data.mode || 'unknown'; 
            const dateStr = timestamp.toLocaleDateString();
            const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const emoji = getMoodEmoji(mood);
            const url = data.url || '#'; 
            
            logHtml += `
                <div class="mood-log-item">
                    <span class="log-date">${dateStr} at ${timeStr}</span>
                    <span class="log-mood"><span class="emoji">${emoji}</span>${mood}</span>
                    <span class="log-mode-pill" data-mode="${mode}">${mode}</span>
                    <a href="${url}" target="_blank" class="history-link" title="Play Again">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>`;
        });
        moodLogList.innerHTML = logHtml;
    } catch (error) {
        console.error("Error loading mood history:", error);
        moodLogList.innerHTML = '<p style="color: red; text-align: center;">Error loading history.</p>';
    }
}

async function loadUserPlaylists(userId) {
    try { 
        const docRef = doc(db, "userPlaylists", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            happyPlaylistInput.value = data.happy || ''; 
            sadPlaylistInput.value = data.sad || '';
            stressedPlaylistInput.value = data.stressed || ''; 
            focusedPlaylistInput.value = data.focused || '';
        }
    } catch (error) { console.error("Error loading playlists:", error); }
}

savePlaylistsBtn.addEventListener('click', async () => {
    if (!currentUserId) return;
    const playlistData = {
        happy: happyPlaylistInput.value, 
        sad: sadPlaylistInput.value,
        stressed: stressedPlaylistInput.value, 
        focused: focusedPlaylistInput.value
    };
    try {
        const docRef = doc(db, "userPlaylists", currentUserId);
        await setDoc(docRef, playlistData);
        alert('Playlists saved!');
    } catch (e) { console.error("Error saving playlists: ", e); alert('Failed to save playlists.'); }
});

happyPlaylistBtn.addEventListener('click', () => handlePlaylistClick('happy'));
sadPlaylistBtn.addEventListener('click', () => handlePlaylistClick('sad'));
stressedPlaylistBtn.addEventListener('click', () => handlePlaylistClick('stressed'));
focusedPlaylistBtn.addEventListener('click', () => handlePlaylistClick('focused'));

happyQueryBtn.addEventListener('click', () => handleQueryStep1('happy'));
sadQueryBtn.addEventListener('click', () => handleQueryStep1('sad'));
stressedQueryBtn.addEventListener('click', () => handleQueryStep1('stressed'));
focusedQueryBtn.addEventListener('click', () => handleQueryStep1('focused'));

langButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const lang = e.target.getAttribute('data-lang');
        handleQueryStep2(lang);
    });
});

cancelQueryBtn.addEventListener('click', resetQueryView);

async function handlePlaylistClick(mood) {
    if (!currentUserId) return;
    
    let targetUrl = '';
    switch (mood) {
        case 'happy': targetUrl = happyPlaylistInput.value; break;
        case 'sad': targetUrl = sadPlaylistInput.value; break;
        case 'stressed': targetUrl = stressedPlaylistInput.value; break;
        case 'focused': targetUrl = focusedPlaylistInput.value; break;
    }

    if (targetUrl) {
        logMoodToDB(mood, 'playlist', targetUrl);
        window.open(targetUrl, '_blank');
    } else {
        alert(`No saved playlist for ${mood}. Try "Instant Query" to find one!`);
        switchView('query-view'); 
    }
}

function handleQueryStep1(mood) {
    pendingQueryMood = mood;
    queryStep1.style.display = 'none';
    queryStep2.style.display = 'block';
    const emoji = getMoodEmoji(mood);
    languageInstruction.textContent = `You chose ${emoji} ${mood.toUpperCase()}. Which language do you prefer?`;
}

async function handleQueryStep2(language) {
    if (!pendingQueryMood || !currentUserId) return;
    
    const langCodes = {
        'Korean': 'ko',
        'Japanese': 'ja',
        'English': 'en',
        'Tagalog': 'tl'
    };
    const langCode = langCodes[language] || 'en';

    let moodKeywords = '';
    switch (pendingQueryMood) {
        case 'happy': moodKeywords = 'upbeat pop song'; break;
        case 'sad': moodKeywords = 'sad acoustic ballad'; break;
        case 'stressed': moodKeywords = 'relaxing healing music'; break;
        case 'focused': moodKeywords = 'lofi study beats instrumental'; break;
    }

    const finalQuery = `${language} ${moodKeywords}`;
    alert(`EmoTune is finding a random ${language} song for your ${pendingQueryMood} mood...`);

    try {
        const apiUrl = `${YOUTUBE_API_URL}?part=id&type=video&q=${encodeURIComponent(finalQuery)}&maxResults=20&relevanceLanguage=${langCode}&key=${YOUTUBE_API_KEY}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const randomIndex = Math.floor(Math.random() * data.items.length);
            const videoId = data.items[randomIndex].id.videoId;
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            
            logMoodToDB(pendingQueryMood, 'query', videoUrl);
            
            window.open(videoUrl, '_blank');
        } else {
            console.warn("No videos found, fallback to search.");
            const fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(finalQuery)}`;
            logMoodToDB(pendingQueryMood, 'query', fallbackUrl);
            window.open(fallbackUrl, '_blank');
        }
    } catch (error) {
        console.error("YouTube API Error:", error);
        alert("Error finding video. Opening search results.");
        const fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(finalQuery)}`;
        window.open(fallbackUrl, '_blank');
    }
    resetQueryView();
}

function resetQueryView() {
    queryStep1.style.display = 'block';
    queryStep2.style.display = 'none';
    pendingQueryMood = null;
}

async function logMoodToDB(mood, mode, url) {
    try {
        await addDoc(collection(db, "moods"), {
            mood: mood, 
            timestamp: new Date(), 
            userId: currentUserId, 
            mode: mode,
            url: url || '#' 
        });
        console.log("Mood logged:", mood, mode, url);
    } catch (e) { console.error("Error logging mood: ", e); }
}

if (sendFeedbackBtn) {
    sendFeedbackBtn.addEventListener('click', () => {
        const message = feedbackText.value;
        if (!message) { alert("Please type a message first."); return; }

        sendFeedbackBtn.textContent = "Sending...";
        sendFeedbackBtn.disabled = true;

        const serviceID = "service_oqnoc1a"; 
        const templateID = "template_5050gth"; 

        emailjs.send(serviceID, templateID, {
            message: message,
            user_id: currentUserId || "Anonymous",
            user_email: "emointelligence897@gmail.com"
        }).then(
            function(response) {
                alert("Feedback sent successfully! Thank you.");
                feedbackText.value = ""; 
                sendFeedbackBtn.textContent = "Send Feedback";
                sendFeedbackBtn.disabled = false;
            },
            function(error) {
                console.error("FAILED...", error);
                alert("Failed to send feedback. Please check your internet.");
                sendFeedbackBtn.textContent = "Send Feedback";
                sendFeedbackBtn.disabled = false;
            }
        );
    });
}