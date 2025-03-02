const loginBtn = document.getElementById('login-btn');
const uploadForm = document.getElementById('upload-form');
const repoSelect = document.getElementById('repo-select');
const folderNameInput = document.getElementById('folder-name');
const pyFileInput = document.getElementById('py-file');
const txtFileInput = document.getElementById('txt-file');
const pngFileInput = document.getElementById('png-file');
const uploadStatus = document.getElementById('upload-status');
const loginMessage = document.getElementById('login-message');
let token = null;

// Helper function to generate a random string for code verifier
function generateRandomString(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
}

// Helper function to generate the code challenge from the verifier
async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function checkToken() {
    const query = window.location.search.substring(1);
    const params = new URLSearchParams(query);
    const code = params.get('code');
    console.log('Full URL:', window.location.href);
    console.log('Query:', query, 'Code:', code);

    if (code) {
        exchangeCodeForToken(code).then(accessToken => {
            token = accessToken;
            updateLoginDisplay();
            fetchRepos();
            window.history.replaceState({}, document.title, window.location.pathname); // Clean URL
        }).catch(error => {
            uploadStatus.textContent = `Login failed: ${error.message}`;
            console.error('Token exchange error:', error);
        });
    } else {
        console.log('No code found—user needs to log in.');
        uploadStatus.textContent = '';
    }
}

console.log('Portal.js loaded—checking token...');
checkToken();
document.addEventListener('DOMContentLoaded', checkToken);

loginBtn.addEventListener('click', async () => {
    const clientId = 'Ov23li9iYPQVwLbJEUEN';
    const redirectUri = 'https://www.beb.tools/portal.html';
    const scope = 'public_repo';
    const state = Math.random().toString(36).substring(2);
    const codeVerifier = generateRandomString(128);
    localStorage.setItem('codeVerifier', codeVerifier); // Store verifier for exchange
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    console.log('Redirecting to:', authUrl);
    window.location.href = authUrl;
});

async function exchangeCodeForToken(code) {
    const clientId = 'Ov23li9iYPQVwLbJEUEN';
    const redirectUri = 'https://www.beb.tools/portal.html';
    const codeVerifier = localStorage.getItem('codeVerifier');

    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            client_id: clientId,
            code: code,
            code_verifier: codeVerifier,
            redirect_uri: redirectUri
        })
    });

    if (!response.ok) throw new Error('Failed to exchange code for token');
    const data = await response.json();
    localStorage.removeItem('codeVerifier'); // Clean up
    return data.access_token;
}

async function updateLoginDisplay() {
    try {
        console.log('Fetching user data with token:', token);
        const response = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `token ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch user data');
        const user = await response.json();
        loginBtn.innerHTML = `<img src="${user.avatar_url}" alt="${user.login}"><span>${user.login}</span>`;
        loginBtn.classList.add('profile');
        loginBtn.disabled = true;
        uploadForm.style.display = 'block';
        loginMessage.style.display = 'none';
        console.log('User logged in:', user.login);
    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
        console.error('Update login error:', error);
    }
}

async function fetchRepos() {
    try {
        console.log('Fetching repos...');
        const response = await fetch('https://api.github.com/user/repos', {
            headers: { 'Authorization': `token ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch repos');
        const repos = await response.json();
        repoSelect.innerHTML = '<option value="">-- Select a repo or create new --</option>';
        repos.forEach(repo => {
            if (repo.topics && repo.topics.includes('bebtools')) {
                const option = document.createElement('option');
                option.value = repo.name;
                option.textContent = repo.name;
                repoSelect.appendChild(option);
            }
        });
        const newRepoOption = document.createElement('option');
        newRepoOption.value = 'new';
        newRepoOption.textContent = '+ New Repo';
        repoSelect.appendChild(newRepoOption);
        console.log('Repos loaded:', repos.length);
    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
        console.error('Fetch repos error:', error);
    }
}

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    uploadStatus.textContent = 'Uploading...';

    const repoName = repoSelect.value === 'new' ? `bebtools-${Date.now()}` : repoSelect.value;
    const folderName = folderNameInput.value.trim();
    const pyFile = pyFileInput.files[0];
    const txtFile = txtFileInput.files[0];
    const pngFile = pngFileInput.files[0];

    if (!folderName || !pyFile || !pngFile) {
        uploadStatus.textContent = 'Please fill all required fields.';
        return;
    }

    try {
        const username = (await (await fetch('https://api.github.com/user', { headers: { 'Authorization': `token ${token}` } })).json()).login;
        if (repoSelect.value === 'new') {
            await createRepo(repoName);
        }

        await uploadFile(username, repoName, `${folderName}/${folderName}.py`, pyFile);
        if (txtFile) await uploadFile(username, repoName, `${folderName}/${folderName}.txt`, txtFile);
        await uploadFile(username, repoName, `${folderName}/${folderName}.png`, pngFile);

        await updateRepoTopics(username, repoName);

        uploadStatus.textContent = 'Upload successful! Script added to your repo.';
        uploadForm.reset();
    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
        console.error('Upload error:', error);
    }
});

async function createRepo(repoName) {
    const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: repoName, private: false })
    });
    if (!response.ok) throw new Error('Failed to create repo');
}

async function uploadFile(username, repoName, path, file) {
    const reader = new FileReader();
    const content = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });
    const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Add ${path}`,
            content: content
        })
    });
    if (!response.ok) throw new Error(`Failed to upload ${path}`);
}

async function updateRepoTopics(username, repoName) {
    const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/topics`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.mercy-preview+json'
        },
        body: JSON.stringify({ names: ['bebtools'] })
    });
    if (!response.ok) throw new Error('Failed to tag repo');
}