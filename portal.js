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
const refreshReposBtn = document.getElementById('refresh-repos');
const newRepoNameInput = document.getElementById('new-repo-name');
const createRepoBtn = document.getElementById('create-repo-btn');
const namingRule = document.querySelector('.naming-rule');
const scriptSection = document.getElementById('script-section');
const scriptRepoSelect = document.getElementById('script-repo-select');
const scriptList = document.getElementById('script-list');
const scriptStatus = document.getElementById('script-status');
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
        scriptSection.style.display = 'block';
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
            fetchScriptRepos();
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
            dropZone.style.backgroundImage = 'none';
        } else {
            dropZone.textContent = '';
            dropZone.style.backgroundImage = "url('dragdrop.svg')";
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
                deleteBtn.onclick = () => window.open('https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository', '_blank');
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

async function fetchScriptRepos() {
    if (!auth.getToken()) {
        scriptStatus.textContent = 'Error: No GitHub token available.';
        scriptStatus.classList.add('error');
        return;
    }
    try {
        const response = await fetch('https://api.github.com/user/repos', {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch repos');
        const repos = await response.json();
        scriptRepoSelect.innerHTML = '<option value="">-- Select a repository --</option>';
        repos.forEach(repo => {
            if (repo.topics && repo.topics.includes('bebtools')) {
                const option = document.createElement('option');
                option.value = repo.name;
                option.textContent = repo.name;
                scriptRepoSelect.appendChild(option);
            }
        });
    } catch (error) {
        scriptStatus.textContent = `Error: ${error.message}`;
        scriptStatus.classList.add('error');
        console.error('Fetch script repos error:', error);
    }
}

async function fetchScripts(repoName) {
    if (!repoName) {
        scriptList.innerHTML = '';
        return;
    }
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch repo contents');
        const contents = await response.json();
        scriptList.innerHTML = '';
        contents.forEach(item => {
            if (item.type === 'dir') {
                const li = document.createElement('li');
                li.textContent = item.name;
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'button-container';

                const renameBtn = document.createElement('button');
                renameBtn.textContent = 'Rename';
                renameBtn.className = 'rename-btn';
                renameBtn.onclick = () => renameScriptFolder(repoName, item.name);
                buttonContainer.appendChild(renameBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'delete-btn';
                deleteBtn.onclick = () => deleteScriptFolder(repoName, item.name);
                buttonContainer.appendChild(deleteBtn);

                li.appendChild(buttonContainer);
                scriptList.appendChild(li);
            }
        });
    } catch (error) {
        scriptStatus.textContent = `Error: ${error.message}`;
        scriptStatus.classList.add('error');
        console.error('Fetch scripts error:', error);
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
    window.open('https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository', '_blank');
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
        fetchScriptRepos();
    } catch (error) {
        repoStatus.textContent = `Error: ${error.message}`;
        repoStatus.classList.add('error');
        console.error('Rename repo error:', error);
    }
}

async function deleteScriptFolder(repoName, folderName) {
    if (!confirm(`Delete folder ${folderName} and its contents? This cannot be undone.`)) return;
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${folderName}`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch folder contents');
        const contents = await response.json();

        for (const item of contents) {
            await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${item.path}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Delete ${item.path}`, sha: item.sha })
            });
        }
        scriptStatus.textContent = `Folder ${folderName} deleted.`;
        fetchScripts(repoName);
    } catch (error) {
        scriptStatus.textContent = `Error: ${error.message}`;
        scriptStatus.classList.add('error');
        console.error('Delete script folder error:', error);
    }
}

async function renameScriptFolder(repoName, oldName) {
    const newName = prompt(`Enter new name for ${oldName}:`, oldName);
    if (!newName || newName === oldName) return;
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${oldName}`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch folder contents');
        const contents = await response.json();

        for (const item of contents) {
            const oldPath = item.path;
            const newPath = `${newName}/${newName}${oldPath.substring(oldPath.lastIndexOf('.'))}`;
            const fileResponse = await fetch(item.download_url, { method: 'GET', headers: { 'Accept': 'application/octet-stream' } });
            const blob = await fileResponse.blob();
            const reader = new FileReader();
            const base64Content = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(blob);
            });

            await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${newPath}`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Rename ${oldPath} to ${newPath}`, content: base64Content })
            });

            await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${oldPath}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Delete ${oldPath}`, sha: item.sha })
            });
        }
        scriptStatus.textContent = `Folder renamed to ${newName} and files updated.`;
        fetchScripts(repoName);
    } catch (error) {
        scriptStatus.textContent = `Error: ${error.message}`;
        scriptStatus.classList.add('error');
        console.error('Rename script folder error:', error);
    }
}

refreshReposBtn.addEventListener('click', () => {
    fetchRepos();
    fetchScriptRepos();
});

createRepoBtn.addEventListener('click', () => {
    const repoName = newRepoNameInput.value.trim();
    if (!repoName) {
        repoStatus.textContent = 'Please enter a repository name.';
        repoStatus.classList.add('error');
        return;
    }
    createRepo(repoName);
});

scriptRepoSelect.addEventListener('change', () => {
    fetchScripts(scriptRepoSelect.value);
});

setupDragAndDrop(pyFileInput, pyDropZone);
setupDragAndDrop(txtFileInput, txtDropZone);
setupDragAndDrop(pngFileInput, pngDropZone);

checkSession();