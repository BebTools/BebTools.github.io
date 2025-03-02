// auth.js
console.log('auth.js loaded');

// Initialize Supabase client
const supabase = window.supabase.createClient(
    'https://uopqmdgsruqsamqowmsx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcHFtZGdzcnVxc2FtcW93bXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5NDg0NjQsImV4cCI6MjA1NjUyNDQ2NH0.2dHyZo0K-ORoD4AQmLVb-tI3I-ky_c2iGMCLIOiD1k4'
);

// Shared state
let token = null;

// Check session and handle OAuth redirect
async function checkSession(callback) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Session check error:', error);
        return null;
    }
    if (session) {
        token = session.provider_token;
        console.log('Existing session found:', session);
        callback(session.user);
        return session.user;
    } else {
        console.log('No existing session, waiting for OAuth redirect...');
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                token = session.provider_token;
                console.log('Signed in with token:', token);
                callback(session.user);
            }
        });
        return null;
    }
}

// Trigger GitHub login
async function loginWithGitHub() {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { scopes: 'public_repo' }
        });
        if (error) throw error;
    } catch (error) {
        console.error('Login error:', error);
        return error.message;
    }
}

// Update login button UI
function updateLoginDisplay(user, loginBtn) {
    loginBtn.innerHTML = `<img src="${user.user_metadata.avatar_url}" alt="${user.user_metadata.preferred_username}"><span>${user.user_metadata.preferred_username}</span>`;
    loginBtn.classList.add('profile');
    loginBtn.disabled = true;
}

// Expose functions globally
window.auth = {
    checkSession,
    loginWithGitHub,
    updateLoginDisplay,
    getToken: () => token
};