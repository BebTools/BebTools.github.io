// Debug log to confirm script execution
console.log('portal.js loaded');

// Debug log to confirm Supabase availability before usage
console.log('Supabase available:', typeof Supabase !== 'undefined' ? 'Yes' : 'No');

// Initialize Supabase client
const supabase = Supabase.createClient(
    'https://uopqmdgsruqsamqowmsx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcHFtZGdzcnVxc2FtcW93bXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5NDg0NjQsImV4cCI6MjA1NjUyNDQ2NH0.2dHyZo0K-ORoD4AQmLVb-tI3I-ky_c2iGMCLIOiD1k4'
);

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

// Check session on page load
async function checkSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Session check error:', error);
        return;
    }
    if (session) {
        token = session.provider_token; // GitHub access token
        const user = session.user;
        await updateLoginDisplay(user);
        await fetchRepos();
    }
}
checkSession();

loginBtn.addEventListener('click', async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { scopes: 'public_repo' }
        });
        if (error) throw error;
        // Redirect handles login—token fetched on return
    } catch (error) {
        uploadStatus.textContent = `Login failed: ${error.message}`;
        console.error('Login error:', error);
    }
});

async function updateLoginDisplay(user) {
    loginBtn.innerHTML = `<img src="${user.user_metadata.avatar_url}" alt="${user.user_metadata.preferred_username}"><span>${user.user_metadata.preferred_username}</span>`;
    loginBtn.classList.add('profile');
    loginBtn.disabled = true;
    uploadForm.style.display = 'block';
    loginMessage.style.display = 'none';
    console.log('User logged in:', user.user_metadata.preferred_username);
}

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
        const { data: { user } } = await supabase.auth.getUser();
        const username = user.user_metadata.preferred_username;
        if (repoSelect.value === 'new') await createRepo(repoName);
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
        headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
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
        headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Add ${path}`, content: content })
    });
    if (!response.ok) throw new Error(`Failed to upload ${path}`);
}

async function updateRepoTopics(username, repoName) {
    const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/topics`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.mercy-preview+json' },
        body: JSON.stringify({ names: ['bebtools'] })
    });
    if (!response.ok) throw new Error('Failed to tag repo');
}