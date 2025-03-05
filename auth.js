// auth.js
console.log('auth.js loaded');

const supabase = window.supabase.createClient(
    'https://uopqmdgsruqsamqowmsx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcHFtZGdzcnVxc2FtcW93bXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5NDg0NjQsImV4cCI6MjA1NjUyNDQ2NH0.2dHyZo0K-ORoD4AQmLVb-tI3I-ky_c2iGMCLIOiD1k4'
);

let token = null;

async function checkSession(callback) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Session check error:', error);
        callback(null);
        return null;
    }
    if (session && session.provider_token) {
        token = session.provider_token;
        console.log('Existing session found:', session);
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: { 'Authorization': `token ${token}` }
            });
            if (!response.ok) throw new Error(`GitHub token validation failed: ${response.status}`);
            const user = session.user;
            sessionStorage.setItem('github_user', JSON.stringify(user)); // Cache user
            callback(user);
            return user;
        } catch (error) {
            console.error('Token validation failed:', error);
            token = null; // Clear invalid token
            await supabase.auth.signOut(); // Clear Supabase session
            sessionStorage.removeItem('github_user');
            callback(null);
            return null;
        }
    } else {
        console.log('No existing session, waiting for OAuth redirect...');
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session && session.provider_token) {
                token = session.provider_token;
                console.log('Signed in with token:', token);
                try {
                    fetch('https://api.github.com/user', {
                        headers: { 'Authorization': `token ${token}` }
                    }).then(response => {
                        if (!response.ok) throw new Error('GitHub token validation failed after sign-in');
                        const user = session.user;
                        sessionStorage.setItem('github_user', JSON.stringify(user));
                        callback(user);
                    }).catch(error => {
                        console.error('Post-login token validation failed:', error);
                        token = null;
                        supabase.auth.signOut();
                        callback(null);
                    });
                } catch (error) {
                    console.error('Error during post-login validation:', error);
                    token = null;
                    callback(null);
                }
            }
        });
        callback(null);
        return null;
    }
}

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

function updateLoginDisplay(user, loginBtn) {
    loginBtn.innerHTML = `<img src="${user.user_metadata.avatar_url}" alt="${user.user_metadata.preferred_username}"><span>${user.user_metadata.preferred_username}</span>`;
    loginBtn.classList.add('profile');
    loginBtn.disabled = false; // Ensure clickable for dropdown
}

async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        token = null;
        sessionStorage.removeItem('github_user');
        console.log('Signed out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        return error.message;
    }
}

window.auth = {
    checkSession,
    loginWithGitHub,
    updateLoginDisplay,
    getToken: () => token,
    signOut
};