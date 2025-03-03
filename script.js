const grid = document.querySelector('.grid');
const popup = document.querySelector('.popup');
const code = document.querySelector('.language-python');
const scriptName = document.querySelector('.script-name');
const author = document.querySelector('.author');
const stars = document.querySelector('.stars');
const popupText = document.querySelector('.popup-text');
const searchInput = document.getElementById('search-input');
const loginBtn = document.getElementById('login-btn');
let allScripts = [];
let page = 1;
let loading = false;

async function loadScripts() {
    if (loading) return;
    loading = true;
    console.log(`Loading page ${page}...`);
    try {
        const response = await fetch(`https://api.github.com/search/repositories?q=topic:bebtools&per_page=12&page=${page}`, {
            headers: auth.getToken() ? { 'Authorization': `token ${auth.getToken()}` } : {}
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log(`Found ${data.items.length} repos on page ${page}`);
        const repos = data.items;

        if (repos.length === 0) {
            console.log('No more scripts to load.');
            document.querySelector('.load-more').style.display = 'none';
            return;
        }

        for (const repo of repos) {
            const contents = await fetch(`https://api.github.com/repos/${repo.full_name}/contents`, {
                headers: auth.getToken() ? { 'Authorization': `token ${auth.getToken()}` } : {}
            });
            const files = await contents.json();
            const scriptFolders = files.filter(f => f.type === 'dir');
            for (const scriptFolder of scriptFolders) {
                const folderContents = await fetch(scriptFolder.url, {
                    headers: auth.getToken() ? { 'Authorization': `token ${auth.getToken()}` } : {}
                });
                const folderFiles = await folderContents.json();
                const pyFile = folderFiles.find(f => f.name.endsWith('.py'));
                const txtFile = folderFiles.find(f => f.name.endsWith('.txt'));
                const pngFile = folderFiles.find(f => f.name.endsWith('.png'));
                if (pyFile && pngFile) {
                    const scriptData = {
                        name: scriptFolder.name,
                        author: repo.owner.login,
                        stars: repo.stargazers_count,
                        pyUrl: pyFile.download_url,
                        txtUrl: txtFile ? txtFile.download_url : '',
                        pngUrl: pngFile.download_url
                    };
                    allScripts.push(scriptData);
                }
            }
        }
        page++;
        renderGrid();
    } catch (error) {
        console.error('Error loading scripts:', error);
    } finally {
        loading = false;
    }
}

function renderGrid() {
    grid.innerHTML = '';
    const searchTerm = searchInput.value.toLowerCase();
    const filteredScripts = allScripts.filter(script => script.name.toLowerCase().includes(searchTerm));
    filteredScripts.forEach(script => {
        const box = document.createElement('div');
        box.className = 'grid-box';
        box.innerHTML = `
            <img src="${script.pngUrl}" alt="${script.name}">
            <div class="name">${script.name}</div>
            <div class="author">${script.author}</div>
            <div class="stars">⭐ ${script.stars}</div>
        `;
        box.dataset.pyUrl = script.pyUrl;
        box.dataset.txtUrl = script.txtUrl;
        box.dataset.pngUrl = script.pngUrl;
        box.dataset.name = script.name;
        box.dataset.author = script.author;
        box.dataset.stars = script.stars;
        box.addEventListener('click', showPopup);
        grid.appendChild(box);
    });
}

async function showPopup(event) {
    const box = event.currentTarget;
    popup.style.display = 'flex';
    scriptName.textContent = box.dataset.name;
    author.textContent = box.dataset.author;
    stars.textContent = `⭐ ${box.dataset.stars}`;

    const header = document.querySelector('.popup-header');
    let infoBar = header.querySelector('.info-bar');
    if (!infoBar) {
        infoBar = document.createElement('div');
        infoBar.className = 'info-bar';
        header.insertBefore(infoBar, header.firstChild);
    } else {
        infoBar.innerHTML = '';
    }
    infoBar.appendChild(author);
    infoBar.appendChild(stars);

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    infoBar.appendChild(downloadBtn);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    infoBar.appendChild(copyBtn);

    let img = header.querySelector('img');
    if (!img) {
        img = document.createElement('img');
        header.insertBefore(img, scriptName);
    }
    img.src = box.dataset.pngUrl;

    const maxWidth = scriptName.offsetWidth;
    let fontSize = 24;
    scriptName.style.fontSize = `${fontSize}px`;
    while (scriptName.scrollWidth > maxWidth && fontSize > 12) {
        fontSize--;
        scriptName.style.fontSize = `${fontSize}px`;
    }

    const pyText = await (await fetch(box.dataset.pyUrl)).text();
    code.innerHTML = pyText;
    Prism.highlightElement(code);
    const txtText = box.dataset.txtUrl ? await (await fetch(box.dataset.txtUrl)).text() : 'No description available.';
    popupText.textContent = txtText;

    downloadBtn.onclick = () => downloadZip(pyText, txtText, box.dataset.name);
    copyBtn.onclick = () => copyZip(pyText, txtText, box.dataset.name);
}

async function downloadZip(pyText, txtText, name) {
    const zip = new JSZip();
    zip.file(`${name}.py`, pyText);
    zip.file(`${name}.txt`, txtText);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-script.zip`;
    a.click();
    URL.revokeObjectURL(url);
}

async function copyZip(pyText, txtText, name) {
    const zip = new JSZip();
    zip.file(`${name}.py`, pyText);
    zip.file(`${name}.txt`, txtText);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    navigator.clipboard.writeText(url).then(() => alert('Copied to clipboard! Paste into Beb Tools.'));
}

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    document.querySelector('.close-btn').addEventListener('click', () => popup.style.display = 'none');
    document.querySelector('.load-more').addEventListener('click', loadScripts);
    searchInput.addEventListener('input', renderGrid);

    let dropdownVisible = false;

    loginBtn.addEventListener('click', async (e) => {
        if (loginBtn.classList.contains('profile')) {
            // User is logged in: toggle dropdown
            dropdownVisible = !dropdownVisible;
            profileDropdown.style.display = dropdownVisible ? 'block' : 'none';
        } else {
            // User is not logged in: trigger GitHub login
            const error = await auth.loginWithGitHub();
            if (error) alert(`Login failed: ${error}`);
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        loginBtn.innerHTML = 'Login with GitHub';
        loginBtn.classList.remove('profile');
        loginBtn.disabled = false;
        profileDropdown.style.display = 'none';
        dropdownVisible = false;
    });

    // Close dropdown if clicking outside
    document.addEventListener('click', (e) => {
        if (!loginBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.style.display = 'none';
            dropdownVisible = false;
        }
    });

    auth.checkSession((user) => {
        if (user) {
            auth.updateLoginDisplay(user, loginBtn);
        }
        profileDropdown.style.display = 'none'; // Ensure dropdown is hidden initially
    });

    loadScripts();
});