console.log('portal.js loaded');

const loginBtn = document.getElementById('login-btn');
const uploadForm = document.getElementById('upload-form');
const repoSelect = document.getElementById('repo-select');
const pyFileInput = document.getElementById('py-file');
const txtFileInput = document.getElementById('txt-file');
const jpgFileInput = document.getElementById('jpg-file');
const pyDropZone = document.getElementById('py-drop-zone');
const txtDropZone = document.getElementById('txt-drop-zone');
const jpgDropZone = document.getElementById('jpg-drop-zone');
const uploadStatus = document.getElementById('upload-status');
const loginMessage = document.getElementById('login-message');
const uploadSection = document.getElementById('upload-section');
const repoSection = document.getElementById('repo-section');
const scriptSection = document.getElementById('script-section');
const profileSection = document.getElementById('profile-section');
const repoList = document.getElementById('repo-list');
const repoStatus = document.getElementById('repo-status');
const refreshReposBtn = document.getElementById('refresh-repos');
const newRepoNameInput = document.getElementById('new-repo-name');
const createRepoBtn = document.getElementById('create-repo-btn');
const namingRule = document.querySelector('.naming-rule');
const scriptRepoSelect = document.getElementById('script-repo-select');
const scriptList = document.getElementById('script-list');
const scriptStatus = document.getElementById('script-status');
const enableCreatorLinksBtn = document.getElementById('enable-creator-links');
const creatorLinksDisclaimer = document.getElementById('creator-links-disclaimer');
const linksForm = document.getElementById('links-form');
const websiteLinkInput = document.getElementById('website-link');
const xLinkInput = document.getElementById('x-link');
const donationLinkInput = document.getElementById('donation-link');
const saveLinksBtn = document.getElementById('save-links');
const profileStatus = document.getElementById('profile-status');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');
let username;

async function checkSession() {
    let dropdownVisible = false;

    auth.checkSession(async (user) => {
        if (user && auth.getToken()) {
            auth.updateLoginDisplay(user, loginBtn);
            uploadSection.style.display = 'block';
            repoSection.style.display = 'block';
            scriptSection.style.display = 'block';
            profileSection.style.display = 'block'; // Show new panel
            loginMessage.style.display = 'none';
            try {
                const response = await fetch('https://api.github.com/user', {
                    headers: { 'Authorization': `token ${auth.getToken()}` }
                });
                if (!response.ok) throw new Error('Failed to fetch user');
                const userData = await response.json();
                username = userData.login;
                fetchRepos();
                fetchScriptRepos();
                await setupCreatorLinks();
            } catch (error) {
                uploadStatus.textContent = `Error: ${error.message}`;
                uploadStatus.classList.add('error');
                console.error('User fetch error:', error);
            }
        } else {
            loginBtn.textContent = 'Login to GitHub';
            loginBtn.classList.remove('profile');
            loginBtn.disabled = false;
            uploadSection.style.display = 'none';
            repoSection.style.display = 'none';
            scriptSection.style.display = 'none';
            profileSection.style.display = 'none'; // Hide new panel
            linksForm.style.display = 'none';
            enableCreatorLinksBtn.style.display = 'none';
            creatorLinksDisclaimer.style.display = 'none';
            profileDropdown.style.display = 'none';
            loginMessage.style.display = 'block';
        }
    });

    loginBtn.addEventListener('click', async () => {
        if (loginBtn.classList.contains('profile')) {
            dropdownVisible = !dropdownVisible;
            profileDropdown.style.display = dropdownVisible ? 'block' : 'none';
        } else {
            const error = await auth.loginWithGitHub();
            if (error) {
                uploadStatus.textContent = `Login failed: ${error}`;
                uploadStatus.classList.add('error');
            }
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        loginBtn.innerHTML = 'Login with GitHub';
        loginBtn.classList.remove('profile');
        loginBtn.disabled = false;
        profileDropdown.style.display = 'none';
        dropdownVisible = false;
        uploadSection.style.display = 'none';
        repoSection.style.display = 'none';
        scriptSection.style.display = 'none';
        profileSection.style.display = 'none'; // Hide new panel
        linksForm.style.display = 'none';
        enableCreatorLinksBtn.style.display = 'none';
        creatorLinksDisclaimer.style.display = 'none';
        loginMessage.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
        if (!loginBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.style.display = 'none';
            dropdownVisible = false;
        }
    });
}

async function setupCreatorLinks() {
    try {
        const repoResponse = await fetch(`https://api.github.com/repos/${username}/bebtools`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (repoResponse.ok) {
            const linksResponse = await fetch(`https://api.github.com/repos/${username}/bebtools/contents/links.json`, {
                headers: { 'Authorization': `token ${auth.getToken()}` }
            });
            if (linksResponse.ok) {
                const data = await linksResponse.json();
                const links = JSON.parse(atob(data.content));
                websiteLinkInput.value = links.website || '';
                xLinkInput.value = links.x || '';
                donationLinkInput.value = links.donation || '';
            } else if (linksResponse.status !== 404) {
                throw new Error('Failed to fetch links.json');
            }
            linksForm.style.display = 'block';
            enableCreatorLinksBtn.style.display = 'none';
            creatorLinksDisclaimer.style.display = 'none';
        } else if (repoResponse.status === 404) {
            enableCreatorLinksBtn.style.display = 'block';
            creatorLinksDisclaimer.style.display = 'block';
            linksForm.style.display = 'none';
        } else {
            throw new Error('Failed to check bebtools repo');
        }
    } catch (error) {
        profileStatus.textContent = `Error setting up creator links: ${error.message}`; // Panel-specific
        profileStatus.classList.add('error');
        console.error('Error setting up creator links:', error);
        enableCreatorLinksBtn.style.display = 'block';
        creatorLinksDisclaimer.style.display = 'block';
        linksForm.style.display = 'none';
    }
}

enableCreatorLinksBtn.addEventListener('click', async () => {
    try {
        const repoCheck = await fetch(`https://api.github.com/repos/${username}/bebtools`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!repoCheck.ok && repoCheck.status !== 404) throw new Error('Failed to check bebtools repo');
        if (repoCheck.status === 404) {
            await createRepo('bebtools');
            profileStatus.textContent = 'bebtools repo created successfully!'; // Panel-specific
            profileStatus.classList.remove('error');
        }
        linksForm.style.display = 'block';
        enableCreatorLinksBtn.style.display = 'none';
        creatorLinksDisclaimer.style.display = 'none';
        await setupCreatorLinks();
    } catch (error) {
        profileStatus.textContent = `Error setting up bebtools repo: ${error.message}`; // Panel-specific
        profileStatus.classList.add('error');
    }
});

saveLinksBtn.addEventListener('click', async () => {
    const links = {
        website: websiteLinkInput.value.trim(),
        x: xLinkInput.value.trim(),
        donation: donationLinkInput.value.trim()
    };
    const content = btoa(JSON.stringify(links, null, 2));
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/bebtools/contents/links.json`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Update creator links', content: content })
        });
        if (!response.ok) throw new Error('Failed to save links');
        profileStatus.textContent = 'Creator links saved successfully!'; // Panel-specific
        profileStatus.classList.remove('error');
    } catch (error) {
        profileStatus.textContent = `Error saving links: ${error.message}`; // Panel-specific
        profileStatus.classList.add('error');
        console.error('Save links error:', error);
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
    const jpgFile = jpgFileInput.files[0];
    if (!pyFile) return;
    const baseName = pyFile.name.replace('.py', '');
    let mismatch = false;
    if (txtFile && txtFile.name !== `${baseName}.txt`) mismatch = true;
    if (jpgFile && jpgFile.name !== `${baseName}.jpg`) mismatch = true;
    namingRule.style.display = mismatch ? 'block' : 'none';
}

async function fetchRepos() {
    if (!auth.getToken()) {
        repoStatus.textContent = 'Error: No GitHub token available.'; // Panel-specific
        repoStatus.classList.add('error');
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
        repoStatus.textContent = `Error: ${error.message}`; // Panel-specific
        repoStatus.classList.add('error');
        console.error('Fetch repos error:', error);
    }
}

async function fetchScriptRepos() {
    if (!auth.getToken()) {
        scriptStatus.textContent = 'Error: No GitHub token available.'; // Panel-specific
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
        scriptStatus.textContent = `Error: ${error.message}`; // Panel-specific
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
        const pyFiles = contents.filter(item => item.name.endsWith('.py'));
        pyFiles.forEach(item => {
            const baseName = item.name.replace('.py', '');
            const li = document.createElement('li');
            li.textContent = baseName;
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-container';

            const renameBtn = document.createElement('button');
            renameBtn.textContent = 'Rename';
            renameBtn.className = 'rename-btn';
            renameBtn.onclick = () => renameScriptFolder(repoName, baseName);
            buttonContainer.appendChild(renameBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => deleteScriptFolder(repoName, baseName);
            buttonContainer.appendChild(deleteBtn);

            li.appendChild(buttonContainer);
            scriptList.appendChild(li);
        });
    } catch (error) {
        scriptStatus.textContent = `Error: ${error.message}`; // Panel-specific
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
    const jpgFile = jpgFileInput.files[0];
    const baseName = pyFile ? pyFile.name.replace('.py', '') : null;

    if (!repoName) {
        uploadStatus.textContent = 'Please select a repository.';
        uploadStatus.classList.add('error');
        return;
    }
    if (!pyFile || !jpgFile) {
        uploadStatus.textContent = 'Please provide a .py and .jpg file.';
        uploadStatus.classList.add('error');
        return;
    }
    if ((txtFile && txtFile.name !== `${baseName}.txt`) || jpgFile.name !== `${baseName}.jpg`) {
        uploadStatus.textContent = 'Your .py, .txt, and .jpg must have the same name';
        uploadStatus.classList.add('error');
        return;
    }
    if (!jpgFile.name.toLowerCase().endsWith('.jpg')) {
        uploadStatus.textContent = 'Only .jpg files are allowed for thumbnails';
        uploadStatus.classList.add('error');
        return;
    }
    if (jpgFile.size > 100 * 1024) {
        uploadStatus.textContent = 'Thumbnail must be less than 100KB';
        uploadStatus.classList.add('error');
        return;
    }

    try {
        uploadStatus.textContent = 'Uploading Python script...';
        await uploadFile(username, repoName, `${baseName}.py`, pyFile);
        if (txtFile) {
            uploadStatus.textContent = 'Uploading ReadMe...';
            await uploadFile(username, repoName, `${baseName}.txt`, txtFile);
        }
        uploadStatus.textContent = 'Uploading thumbnail...';
        await uploadFile(username, repoName, `${baseName}.jpg`, jpgFile);
        uploadStatus.textContent = 'Upload successful! Script added to your repo.';
        uploadForm.reset();
        pyDropZone.textContent = '';
        txtDropZone.textContent = '';
        jpgDropZone.textContent = '';
        pyDropZone.style.backgroundImage = "url('dragdrop.svg')";
        txtDropZone.style.backgroundImage = "url('dragdrop.svg')";
        jpgDropZone.style.backgroundImage = "url('dragdrop.svg')";
    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`; // Panel-specific
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
        if (repoName === 'bebtools') {
            profileStatus.textContent = 'bebtools repo created successfully!'; // Panel-specific
            profileStatus.classList.remove('error');
        } else {
            repoStatus.textContent = `Repository ${repoName} created! Refresh to select it.`; // Panel-specific
            repoStatus.classList.remove('error');
            newRepoNameInput.value = '';
        }
    } catch (error) {
        const status = repoName === 'bebtools' ? profileStatus : repoStatus; // Choose correct status
        status.textContent = `Error: ${error.message}`;
        status.classList.add('error');
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
        repoStatus.textContent = `Repository renamed to ${newName}.`; // Panel-specific
        fetchRepos();
        fetchScriptRepos();
    } catch (error) {
        repoStatus.textContent = `Error: ${error.message}`; // Panel-specific
        repoStatus.classList.add('error');
        console.error('Rename repo error:', error);
    }
}

async function deleteScriptFolder(repoName, baseName) {
    if (!confirm(`Delete script ${baseName} and its files? This cannot be undone.`)) return;
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch repo contents');
        const contents = await response.json();

        const filesToDelete = contents.filter(item => 
            item.name === `${baseName}.py` || 
            item.name === `${baseName}.txt` || 
            item.name === `${baseName}.jpg`
        );

        for (const item of filesToDelete) {
            await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${item.name}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Delete ${item.name}`, sha: item.sha })
            });
        }
        scriptStatus.textContent = `Script ${baseName} deleted.`; // Panel-specific
        fetchScripts(repoName);
    } catch (error) {
        scriptStatus.textContent = `Error: ${error.message}`; // Panel-specific
        scriptStatus.classList.add('error');
        console.error('Delete script error:', error);
    }
}

async function renameScriptFolder(repoName, oldBaseName) {
    const newBaseName = prompt(`Enter new name for ${oldBaseName}:`, oldBaseName);
    if (!newBaseName || newBaseName === oldBaseName) return;
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch repo contents');
        const contents = await response.json();

        const filesToRename = contents.filter(item => 
            item.name === `${oldBaseName}.py` || 
            item.name === `${oldBaseName}.txt` || 
            item.name === `${oldBaseName}.jpg`
        );

        for (const item of filesToRename) {
            const oldPath = item.name;
            const newPath = `${newBaseName}${oldPath.substring(oldPath.lastIndexOf('.'))}`;
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
        scriptStatus.textContent = `Script renamed to ${newBaseName}.`; // Panel-specific
        fetchScripts(repoName);
    } catch (error) {
        scriptStatus.textContent = `Error: ${error.message}`; // Panel-specific
        scriptStatus.classList.add('error');
        console.error('Rename script error:', error);
    }
}

refreshReposBtn.addEventListener('click', () => {
    fetchRepos();
    fetchScriptRepos();
});

createRepoBtn.addEventListener('click', () => {
    const repoName = newRepoNameInput.value.trim();
    if (!repoName) {
        repoStatus.textContent = 'Please enter a repository name.'; // Panel-specific
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
setupDragAndDrop(jpgFileInput, jpgDropZone);

checkSession();