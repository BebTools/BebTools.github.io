console.log('portal.js loaded');

const loginBtn = document.getElementById('login-btn');
const uploadForm = document.getElementById('upload-form');
const repoSelect = document.getElementById('repo-select');
const pyFileInput = document.getElementById('py-file');
const txtFileInput = document.getElementById('txt-file');
const pngFileInput = document.getElementById('png-file');
const uploadStatus = document.getElementById('upload-status');
const loginMessage = document.getElementById('login-message');
const uploadSection = document.getElementById('upload-section');
const repoSection = document.getElementById('repo-section');
const repoList = document.getElementById('repo-list');
const templateBtn = document.getElementById('template-btn');
const refreshReposBtn = document.getElementById('refresh-repos');
const newRepoNameInput = document.getElementById('new-repo-name');
const createRepoBtn = document.getElementById('create-repo-btn');

async function checkSession() {
    auth.checkSession((user) => {
        auth.updateLoginDisplay(user, loginBtn);
        uploadSection.style.display = 'block';
        repoSection.style.display = 'block';
        loginMessage.style.display = 'none';
        fetchRepos();
    });
}

loginBtn.addEventListener('click', async () => {
    const error = await auth.loginWithGitHub();
    if (error) uploadStatus.textContent = `Login failed: ${error}`;
});

function setupDragAndDrop(input) {
    input.addEventListener('dragover', (e) => {
        e.preventDefault();
        input.classList.add('dragover');
    });
    input.addEventListener('dragleave', () => input.classList.remove('dragover'));
    input.addEventListener('drop', (e) => {
        e.preventDefault();
        input.classList.remove('dragover');
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change'));
    });
}

async function fetchRepos() {
    try {
        const response = await fetch('https://api.github.com/user/repos', {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch repos');
        const repos = await response.json();
        repoSelect.innerHTML = '<option value="">-- Select a repository --</option>';
        repoList.innerHTML = '';
        repos.forEach(repo => {
            if (repo.topics && repo.topics.includes('bebtools')) {
                const option = document.createElement('option');
                option.value = repo.name;
                option.textContent = repo.name;
                repoSelect.appendChild(option);

                const li = document.createElement('li');
                li.textContent = repo.name;
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'delete-btn';
                deleteBtn.onclick = () => deleteRepo(repo.name);
                li.appendChild(deleteBtn);
                repoList.appendChild(li);
            }
        });
    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
        console.error('Fetch repos error:', error);
    }
}

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    uploadStatus.textContent = 'Uploading...';
    const repoName = repoSelect.value;
    const pyFile = pyFileInput.files[0];
    const txtFile = txtFileInput.files[0];
    const pngFile = pngFileInput.files[0];
    const folderName = pyFile.name.replace('.py', '');

    if (!repoName) {
        uploadStatus.textContent = 'Please select a repository.';
        return;
    }
    if (!pyFile || !pngFile) {
        uploadStatus.textContent = 'Please provide a .py and .png file.';
        return;
    }
    if (pngFile.size > 100 * 1024) {
        uploadStatus.textContent = 'PNG file exceeds 100KB limit.';
        return;
    }

    try {
        const response = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        const user = await response.json();
        const username = user.login;
        uploadStatus.textContent = 'Uploading Python script...';
        await uploadFile(username, repoName, `${folderName}/${folderName}.py`, pyFile);
        if (txtFile) {
            uploadStatus.textContent = 'Uploading description...';
            await uploadFile(username, repoName, `${folderName}/${folderName}.txt`, txtFile);
        }
        uploadStatus.textContent = 'Uploading thumbnail...';
        await uploadFile(username, repoName, `${folderName}/${folderName}.png`, pngFile);
        uploadStatus.textContent = 'Upload successful! Script added to your repo.';
        uploadForm.reset();
    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
        console.error('Upload error:', error);
    }
});

async function createRepo(repoName) {
    try {
        const response = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: repoName, private: false })
        });
        if (!response.ok) throw new Error('Failed to create repo');
        await updateRepoTopics(username, repoName);
        uploadStatus.textContent = `Repository ${repoName} created! Refresh to select it.`;
        newRepoNameInput.value = '';
    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
        console.error('Create repo error:', error);
    }
}

async function uploadFile(username, repoName, path, file) {
    const reader = new FileReader();
    const content = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });
    const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${path}`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Add ${path}`, content: content })
    });
    if (!response.ok) throw new Error(`Failed to upload ${path}`);
}

async function updateRepoTopics(username, repoName) {
    const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/topics`, {
        method: 'PUT',
        headers: { 
            'Authorization': `token ${auth.getToken()}`, 
            'Content-Type': 'application/json', 
            'Accept': 'application/vnd.github.mercy-preview+json' 
        },
        body: JSON.stringify({ names: ['bebtools'] })
    });
    if (!response.ok) throw new Error('Failed to tag repo');
}

async function deleteRepo(repoName) {
    if (!confirm(`Delete ${repoName}? This cannot be undone.`)) return;
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}`, {
            method: 'DELETE',
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to delete repo');
        uploadStatus.textContent = `${repoName} deleted.`;
        fetchRepos();
    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
        console.error('Delete repo error:', error);
    }
}

templateBtn.addEventListener('click', () => {
    const zip = new JSZip();
    zip.file('example.py', '# Blender Script Example\nimport bpy\nprint("Hello, Blender!")');
    zip.file('example.txt', 'This is a sample script for Beb Tools.');
    zip.file('example.png', '');
    zip.generateAsync({ type: 'blob' }).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bebtools-template.zip';
        a.click();
        URL.revokeObjectURL(url);
    });
});

refreshReposBtn.addEventListener('click', fetchRepos);

createRepoBtn.addEventListener('click', () => {
    const repoName = newRepoNameInput.value.trim();
    if (!repoName) {
        uploadStatus.textContent = 'Please enter a repository name.';
        return;
    }
    createRepo(repoName);
});

let username;
fetch('https://api.github.com/user', { headers: { 'Authorization': `token ${auth.getToken()}` } })
    .then(res => res.json())
    .then(user => username = user.login);
setupDragAndDrop(pyFileInput);
setupDragAndDrop(txtFileInput);
setupDragAndDrop(pngFileInput);

checkSession();