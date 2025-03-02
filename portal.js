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

async function startDeviceFlow() {
    const clientId = 'Ov23li9iYPQVwLbJEUEN'; // Your Client ID
    const response = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ client_id: clientId, scope: 'public_repo' })
    });
    const data = await response.json();
    console.log('Device Flow started:', data);

    loginMessage.innerHTML = `Enter this code on GitHub: <strong>${data.user_code}</strong><br><a href="${data.verification_uri}" target="_blank">${data.verification_uri}</a>`;
    loginBtn.disabled = true;

    pollForToken(data.device_code, data.interval);
}

async function pollForToken(deviceCode, interval) {
    const poll = setInterval(async () => {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: 'Ov23li9iYPQVwLbJEUEN', // Your Client ID
                device_code: deviceCode,
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
            })
        });
        const data = await response.json();
        console.log('Polling response:', data);

        if (data.access_token) {
            clearInterval(poll);
            token = data.access_token;
            updateLoginDisplay();
            fetchRepos();
        } else if (data.error === 'authorization_pending') {
            console.log('Waiting for user to enter code...');
        } else if (data.error) {
            clearInterval(poll);
            uploadStatus.textContent = `Error: ${data.error_description}`;
            loginBtn.disabled = false;
        }
    }, interval * 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    loginBtn.addEventListener('click', startDeviceFlow);
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