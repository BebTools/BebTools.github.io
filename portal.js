console.log('portal.js loaded');

const loginBtn = document.getElementById('login-btn');
const uploadForm = document.getElementById('upload-form');
const repoSelect = document.getElementById('repo-select');
const pyFileInput = document.getElementById('py-file');
const txtFileInput = document.getElementById('txt-file');
const pngFileInput = document.getElementById('png-file');
const pyDropZone = document.getElementById('py-drop-zone');
const txtDropZone = document.getElementById('txt-drop-zone');
const pngDropZone = document.getElementById('png-drop-zone');
const uploadStatus = document.getElementById('upload-status');
const loginMessage = document.getElementById('login-message');
const uploadSection = document.getElementById('upload-section');
const repoSection = document.getElementById('repo-section');
const repoList = document.getElementById('repo-list');
const repoStatus = document.getElementById('repo-status');
const templateBtn = document.getElementById('template-btn');
const refreshReposBtn = document.getElementById('refresh-repos');
const newRepoNameInput = document.getElementById('new-repo-name');
const createRepoBtn = document.getElementById('create-repo-btn');
const namingRule = document.querySelector('.naming-rule');
let username;

async function checkSession() {
    auth.checkSession(async (user) => {
        if (!auth.getToken()) {
            loginBtn.textContent = 'Login to GitHub';
            loginBtn.classList.remove('profile');
            loginBtn.disabled = false;
            uploadStatus.textContent = 'Error: No GitHub token available. Please log in.';
            uploadStatus.classList.add('error');
            return;
        }
        auth.updateLoginDisplay(user, loginBtn);
        uploadSection.style.display = 'block';
        repoSection.style.display = 'block';
        loginMessage.style.display = 'none';
        console.log('Token:', auth.getToken());
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: { 'Authorization': `token ${auth.getToken()}` }
            });
            if (!response.ok) throw new Error('Failed to fetch user');
            const userData = await response.json();
            username = userData.login;
            fetchRepos();
        } catch (error) {
            uploadStatus.textContent = `Error: ${error.message}`;
            uploadStatus.classList.add('error');
            console.error('User fetch error:', error);
        }
    });
}

loginBtn.addEventListener('click', async () => {
    const error = await auth.loginWithGitHub();
    if (error) {
        uploadStatus.textContent = `Login failed: ${error}`;
        uploadStatus.classList.add('error');
    }
});

function setupDragAndDrop(input, dropZone) {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change'));
    });
    dropZone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        validateFilenames();
        if (input.files[0]) {
            dropZone.textContent = input.files[0].name;
            dropZone.style.backgroundImage = 'none'; // Remove SVG when file is added
        } else {
            dropZone.textContent = '';
            dropZone.style.backgroundImage = "url('dragdrop.svg')"; // Restore SVG when no file
        }
    });
}

function validateFilenames() {
    const pyFile = pyFileInput.files[0];
    const txtFile = txtFileInput.files[0];
    const pngFile = pngFileInput.files[0];
    if (!pyFile) return;
    const baseName = pyFile.name.replace('.py', '');
    let mismatch = false;
    if (txtFile && txtFile.name !== `${baseName}.txt`) mismatch = true;
    if (pngFile && pngFile.name !== `${baseName}.png`) mismatch = true;
    namingRule.style.display = mismatch ? 'block' : 'none';
}

async function fetchRepos() {
    if (!auth.getToken()) {
        uploadStatus.textContent = 'Error: No GitHub token available.';
        uploadStatus.classList.add('error');
        return;
    }
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
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'button-container';

                const renameBtn = document.createElement('button');
                renameBtn.textContent = 'Rename';
                renameBtn.className = 'rename-btn';
                renameBtn.onclick = () => renameRepo(repo.name);
                buttonContainer.appendChild(renameBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'delete-btn';
                deleteBtn.onclick = () => deleteRepo(repo.name);
                buttonContainer.appendChild(deleteBtn);

                li.appendChild(buttonContainer);
                repoList.appendChild(li);
            }
        });
    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
        uploadStatus.classList.add('error');
        console.error('Fetch repos error:', error);
    }
}

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    uploadStatus.textContent = 'Uploading...';
    uploadStatus.classList.remove('error');
    const repoName = repoSelect.value;
    const pyFile = pyFileInput.files[0];
    const txtFile = txtFileInput.files[0];
    const pngFile = pngFileInput.files[0];
    const baseName = pyFile ? pyFile.name.replace('.py', '') : null;

    if (!repoName) {
        uploadStatus.textContent = 'Please select a repository.';
        uploadStatus.classList.add('error');
        return;
    }
    if (!pyFile || !pngFile) {
        uploadStatus.textContent = 'Please provide a .py and .png file.';
        uploadStatus.classList.add('error');
        return;
    }
    if (txtFile && txtFile.name !== `${baseName}.txt`) {
        uploadStatus.textContent = 'Error: ReadMe (.txt) must match the .py filename.';
        uploadStatus.classList.add('error');
        namingRule.style.display = 'block';
        return;
    }
    if (pngFile.name !== `${baseName}.png`) {
        uploadStatus.textContent = 'Error: Thumbnail (.png) must match the .py filename.';
        uploadStatus.classList.add('error');
        namingRule.style.display = 'block';
        return;
    }
    if (pngFile.size > 100 * 1024) {
        uploadStatus.textContent = 'PNG file exceeds 100KB limit.';
        uploadStatus.classList.add('error');
        return;
    }

    try {
        uploadStatus.textContent = 'Uploading Python script...';
        await uploadFile(username, repoName, `${baseName}/${baseName}.py`, pyFile);
        if (txtFile) {
            uploadStatus.textContent = 'Uploading ReadMe...';
            await uploadFile(username, repoName, `${baseName}/${baseName}.txt`, txtFile);
        }
        uploadStatus.textContent = 'Uploading thumbnail...';
        await uploadFile(username, repoName, `${baseName}/${baseName}.png`, pngFile);
        uploadStatus.textContent = 'Upload successful! Script added to your repo.';
        uploadForm.reset();
        namingRule.style.display = 'none';
        pyDropZone.textContent = '';
        txtDropZone.textContent = '';
        pngDropZone.textContent = '';
        pyDropZone.style.backgroundImage = "url('dragdrop.svg')";
        txtDropZone.style.backgroundImage = "url('dragdrop.svg')";
        pngDropZone.style.backgroundImage = "url('dragdrop.svg')";
    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
        uploadStatus.classList.add('error');
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
        repoStatus.textContent = `Repository ${repoName} created! Refresh to select it.`;
        newRepoNameInput.value = '';
    } catch (error) {
        repoStatus.textContent = `Error: ${error.message}`;
        repoStatus.classList.add('error');
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
        repoStatus.textContent = `${repoName} deleted.`;
        fetchRepos();
    } catch (error) {
        repoStatus.textContent = `Error: ${error.message}`;
        repoStatus.classList.add('error');
        console.error('Delete repo error:', error);
    }
}

async function renameRepo(oldName) {
    const newName = prompt(`Enter new name for ${oldName}:`, oldName);
    if (!newName || newName === oldName) return;
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${oldName}`, {
            method: 'PATCH',
            headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        if (!response.ok) throw new Error('Failed to rename repo');
        repoStatus.textContent = `Repository renamed to ${newName}.`;
        fetchRepos();
    } catch (error) {
        repoStatus.textContent = `Error: ${error.message}`;
        repoStatus.classList.add('error');
        console.error('Rename repo error:', error);
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
        a.download = 'bebtools-example.zip';
        a.click();
        URL.revokeObjectURL(url);
    });
});

refreshReposBtn.addEventListener('click', fetchRepos);

createRepoBtn.addEventListener('click', () => {
    const repoName = newRepoNameInput.value.trim();
    if (!repoName) {
        repoStatus.textContent = 'Please enter a repository name.';
        repoStatus.classList.add('error');
        return;
    }
    createRepo(repoName);
});

setupDragAndDrop(pyFileInput, pyDropZone);
setupDragAndDrop(txtFileInput, txtDropZone);
setupDragAndDrop(pngFileInput, pngDropZone);

checkSession();