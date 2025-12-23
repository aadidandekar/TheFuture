import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getDatabase, ref, set, get, push, onValue, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyB0e3xV72CjnUuWs6UZeX2VtjEuryodk-w",
    authDomain: "coursematch-23.firebaseapp.com",
    databaseURL: "https://coursematch-23-default-rtdb.firebaseio.com",
    projectId: "coursematch-23",
    storageBucket: "coursematch-23.firebasestorage.app",
    messagingSenderId: "808587892839",
    appId: "1:808587892839:web:cd576b99ee5a777d1d1cc2",
    measurementId: "G-M3JYW7EG12"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

// Authentication handlers
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('authOverlay').classList.add('hidden');
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('userName').textContent = user.displayName;
        document.getElementById('userAvatar').src = user.photoURL;
        loadCapsules();
        loadUserBirthday();
    } else {
        currentUser = null;
        document.getElementById('authOverlay').classList.remove('hidden');
        document.getElementById('mainApp').style.display = 'none';
    }
});

document.getElementById('googleSignInBtn').addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Sign in error:', error);
        alert('Failed to sign in. Please try again.');
    }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Tab navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(tabName + 'Tab').classList.add('active');
    });
});

// Load user's birthday
async function loadUserBirthday() {
    const birthdayRef = ref(database, `users/${currentUser.uid}/birthday`);
    const snapshot = await get(birthdayRef);
    if (snapshot.exists()) {
        const birthday = snapshot.val();
        document.getElementById('birthdayInput').value = birthday;
    }
}

// Save user's birthday
async function saveBirthday(birthday) {
    const birthdayRef = ref(database, `users/${currentUser.uid}/birthday`);
    await set(birthdayRef, birthday);
}

// Unlock type change handler
document.getElementById('unlockType').addEventListener('change', function() {
    const type = this.value;
    const valueGroup = document.getElementById('unlockValueGroup');
    const valueInput = document.getElementById('unlockValue');
    const valueLabel = document.getElementById('unlockValueLabel');
    const birthdayGroup = document.getElementById('birthdayGroup');

    if (type === 'manual') {
        valueGroup.style.display = 'none';
        birthdayGroup.style.display = 'none';
    } else {
        valueGroup.style.display = 'block';
        if (type === 'date') {
            valueLabel.textContent = 'Select Date';
            valueInput.type = 'date';
            valueInput.min = new Date().toISOString().split('T')[0];
            birthdayGroup.style.display = 'none';
        } else if (type === 'duration') {
            valueLabel.textContent = 'Months from Now';
            valueInput.type = 'number';
            valueInput.placeholder = '6';
            valueInput.min = '1';
            birthdayGroup.style.display = 'none';
        } else if (type === 'age') {
            valueLabel.textContent = 'Age to Unlock';
            valueInput.type = 'number';
            valueInput.placeholder = '25';
            valueInput.min = '1';
            birthdayGroup.style.display = 'block';
        }
    }
});

// Seal capsule function
window.sealCapsule = async function() {
    const title = document.getElementById('capsuleTitle').value.trim();
    const content = document.getElementById('capsuleContent').value.trim();
    const type = document.getElementById('capsuleType').value;
    const unlockType = document.getElementById('unlockType').value;
    const unlockValue = document.getElementById('unlockValue').value;
    const birthday = document.getElementById('birthdayInput').value;

    if (!title || !content) {
        alert('Please fill in the title and message!');
        return;
    }

    if (unlockType !== 'manual' && !unlockValue) {
        alert('Please set an unlock condition!');
        return;
    }

    if (unlockType === 'age' && !birthday) {
        alert('Please enter your birthday for age-based unlock!');
        return;
    }

    // Show lock animation
    document.getElementById('lockModal').classList.add('active');

    setTimeout(async () => {
        let unlockDate;
        let unlockDisplay;

        if (unlockType === 'date') {
            unlockDate = new Date(unlockValue).toISOString();
            unlockDisplay = formatPoeticallyDate(new Date(unlockValue));
        } else if (unlockType === 'duration') {
            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + parseInt(unlockValue));
            unlockDate = futureDate.toISOString();
            unlockDisplay = `~${unlockValue} month${unlockValue > 1 ? 's' : ''} away`;
        } else if (unlockType === 'age') {
            if (birthday) {
                await saveBirthday(birthday);
                const birthDate = new Date(birthday);
                const targetAge = parseInt(unlockValue);
                const unlockYear = birthDate.getFullYear() + targetAge;
                const targetDate = new Date(birthDate);
                targetDate.setFullYear(unlockYear);
                unlockDate = targetDate.toISOString();
                unlockDisplay = `When you turn ${unlockValue}`;
            }
        } else {
            unlockDisplay = 'Manual unlock only';
            unlockDate = null;
        }

        const capsule = {
            type,
            title,
            content,
            unlockType,
            unlockDate,
            unlockDisplay,
            createdAt: new Date().toISOString(),
            opened: false
        };

        try {
            const newCapsuleRef = push(ref(database, `capsules/${currentUser.uid}`));
            await set(newCapsuleRef, capsule);
            
            // Clear form
            document.getElementById('capsuleTitle').value = '';
            document.getElementById('capsuleContent').value = '';
            
            // Close modal and switch to capsules tab
            document.getElementById('lockModal').classList.remove('active');
            document.querySelector('[data-tab="capsules"]').click();
        } catch (error) {
            console.error('Error saving capsule:', error);
            alert('Failed to save capsule. Please try again.');
            document.getElementById('lockModal').classList.remove('active');
        }
    }, 2000);
};

// Load capsules
async function loadCapsules() {
    const capsuleList = document.getElementById('capsuleList');
    capsuleList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading your capsules...</p></div>';

    const capsulesRef = ref(database, `capsules/${currentUser.uid}`);
    
    onValue(capsulesRef, (snapshot) => {
        const data = snapshot.val();
        
        if (!data) {
            capsuleList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <h3>No capsules yet</h3>
                    <p>Create your first time capsule in the Create New tab!</p>
                </div>
            `;
            return;
        }

        const capsules = Object.entries(data).map(([id, capsule]) => ({
            id,
            ...capsule
        }));

        renderCapsules(capsules);
    });
}

// Render capsules
function renderCapsules(capsules) {
    const list = document.getElementById('capsuleList');
    
    const icons = {
        letter: '✉️',
        emergency: '🚨'
    };

    list.innerHTML = capsules.map(c => {
        const unlockDate = c.unlockDate ? new Date(c.unlockDate) : null;
        const canOpen = unlockDate ? new Date() >= unlockDate : c.unlockType === 'manual';

        return `
            <div class="capsule-item">
                <div class="capsule-info">
                    <h4>${icons[c.type]} ${c.title}</h4>
                    <p class="capsule-countdown">${c.unlockDisplay}</p>
                    <p class="capsule-date">Created: ${new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                <button class="btn-open" ${!canOpen && !c.opened ? 'disabled' : ''} 
                        onclick="window.openCapsule('${c.id}')">
                    ${c.opened ? '👁️ View Again' : (canOpen ? '🔓 Open' : '🔒 Sealed')}
                </button>
            </div>
        `;
    }).join('');
}

// Format date poetically
function formatPoeticallyDate(date) {
    const now = new Date();
    const diff = date - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) {
        return `~${years} year${years > 1 ? 's' : ''} away`;
    } else if (months > 0) {
        const seasons = Math.floor(months / 3);
        return seasons > 0 ? `~${seasons} season${seasons > 1 ? 's' : ''} away` : `~${months} month${months > 1 ? 's' : ''} away`;
    } else if (days > 0) {
        return `~${days} day${days > 1 ? 's' : ''} away`;
    } else {
        return 'Ready to open!';
    }
}

// Open capsule
window.openCapsule = async function(capsuleId) {
    try {
        const capsuleRef = ref(database, `capsules/${currentUser.uid}/${capsuleId}`);
        const snapshot = await get(capsuleRef);
        const capsule = snapshot.val();

        if (!capsule) return;

        // Mark as opened if not already
        if (!capsule.opened) {
            await update(capsuleRef, { opened: true });
        }

        const modal = document.getElementById('openModal');
        const reveal = document.getElementById('capsuleReveal');

        reveal.innerHTML = `
            <div class="capsule-reveal">
                <div class="reveal-header">
                    <h2>📬 Time Capsule</h2>
                    <p class="reveal-date">Sealed on ${new Date(capsule.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</p>
                </div>
                <div class="reveal-content">
                    <h3>${capsule.title}</h3>
                    <p>${capsule.content}</p>
                </div>
            </div>
        `;

        modal.classList.add('active');
    } catch (error) {
        console.error('Error opening capsule:', error);
        alert('Failed to open capsule. Please try again.');
    }
};

// Close modal
window.closeOpenModal = function() {
    document.getElementById('openModal').classList.remove('active');
};