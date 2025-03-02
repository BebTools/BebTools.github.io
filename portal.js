const loginBtn = document.getElementById('login-btn');
const uploadForm = document.getElementById('upload-form');
const repoSelect = document.getElementById('repo-select');
const folderNameInput = document.getElementById('folder-name');
const pyFileInput = document.getElementById('py-file');
const txtFileInput = document.getElementById('txt-file');
const pngFileInput = document.getElementById('png-file');
const uploadStatus = document.getElementById('upload-status');
let token = null;

// Check for OAuth token in URL hash after redirect
document.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    token = params.get('access_token');
    if (token) {
        loginBtn.textContent = 'Logged In';
        loginBtn.disabled = true;
        uploadForm.style.display = 'block';
        document.getElementById('login-message').style.display = 'none';
        fetchRepos();
    }
});

// GitHub OAuth login
loginBtn.addEventListener('click', () => {
    const clientId = 'YOUR_CLIENT_ID'; // Replace with your GitHub OAuth App Client ID
    const redirectUri = `${window.location.origin}/portal.html`;
    const scope = 'public_repo';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
});

// Fetch user’s repos tagged with #bebtools
async function fetchRepos() {
    try {
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
    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
    }
}

// Handle form submission
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
        // Create or use repo
        if (repoSelect.value === 'new') {
            await createRepo(repoName);
        }

        // Upload files
        await uploadFile(repoName, `${folderName}/${folderName}.py`, pyFile);
        if (txtFile) await uploadFile(repoName, `${folderName}/${folderName}.txt`, txtFile);
        await uploadFile(repoName, `${folderName}/${folderName}.png`, pngFile);

        // Tag repo with #bebtools
        await updateRepoTopics(repoName);

        uploadStatus.textContent = 'Upload successful! Script added to your repo.';
        uploadForm.reset();
    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
    }
});

// Create new repo
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

// Upload file to repo
async function uploadFile(repoName, path, file) {
    const reader = new FileReader();
    const content = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]); // Base64 content
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

// Update repo topics
async function updateRepoTopics(repoName) {
    const response = await fetch(`https://api.github.com/repos/${window.location.pathname.split('/')[1]}/${repoName}/topics`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.mercy-preview+json' // Topics API preview header
        },
        body: JSON.stringify({ names: ['bebtools'] })
    });
    if (!response.ok) throw new Error('Failed to tag repo');
}