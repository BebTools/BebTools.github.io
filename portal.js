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

function checkToken() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    token = params.get('access_token');
    console.log('Checking token - Hash:', hash, 'Token:', token);
    if (token) {
        updateLoginDisplay();
        fetchRepos();
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        console.log('No token found in hash—checking query params...');
        const query = window.location.search.substring(1);
        const queryParams = new URLSearchParams(query);
        const code = queryParams.get('code');
        console.log('Query:', query, 'Code:', code);
        if (code) {
            uploadStatus.textContent = 'Login failed: Received code instead of token. Check OAuth app settings and try again.';
            console.warn('Code flow detected—implicit flow (response_type=token) not working. Verify Client ID and OAuth app config.');
        }
    }
}

console.log('Portal.js loaded—checking token...'); // Debug load
checkToken();
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded—rechecking token...'); // Debug DOM
    checkToken();
});

loginBtn.addEventListener('click', () => {
    const clientId = 'Ov23li9iYPQVwLbJEUEN'; // REPLACE WITH YOUR CLIENT ID
    const redirectUri = `${window.location.origin}/portal.html`;
    const scope = 'public_repo';
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=token`;
    console.log('Redirecting to:', authUrl);
    window.location.href = authUrl;
});

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
        if (repoSelect.value === 'new') {
            await createRepo(repoName);
        }

        await uploadFile(repoName, `${folderName}/${folderName}.py`, pyFile);
        if (txtFile) await uploadFile(repoName, `${folderName}/${folderName}.txt`, txtFile);
        await uploadFile(repoName, `${folderName}/${folderName}.png`, pngFile);

        await updateRepoTopics(repoName);

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

async function uploadFile(repoName, path, file) {
    const reader = new FileReader();
    const content = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });
    const response = await fetch(`https://api.github.com/repos/${window.location.pathname.split('/')[1]}/${repoName}/contents/${path}`, {
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

async function updateRepoTopics(repoName) {
    const response = await fetch(`https://api.github.com/repos/${window.location.pathname.split('/')[1]}/${repoName}/topics`, {
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