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
            const pyFiles = files.filter(f => f.name.endsWith('.py'));
            for (const pyFile of pyFiles) {
                const baseName = pyFile.name.replace('.py', '');
                const txtFile = files.find(f => f.name === `${baseName}.txt`);
                const jpgFile = files.find(f => f.name === `${baseName}.jpg`);
                if (pyFile && jpgFile) {
                    const scriptData = {
                        name: baseName,
                        author: repo.owner.login,
                        authorUrl: repo.owner.html_url,
                        authorAvatar: repo.owner.avatar_url, // Add avatar URL
                        stars: repo.stargazers_count,
                        pyUrl: pyFile.download_url,
                        txtUrl: txtFile ? txtFile.download_url : '',
                        jpgUrl: jpgFile.download_url
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
            <img src="${script.jpgUrl}" alt="${script.name}">
            <div class="text-row">
                <div class="name">${script.name}</div>
                <div class="stars">⭐ ${script.stars}</div>
            </div>
        `;
        box.dataset.pyUrl = script.pyUrl;
        box.dataset.txtUrl = script.txtUrl;
        box.dataset.jpgUrl = script.jpgUrl;
        box.dataset.name = script.name;
        box.dataset.author = script.author;
        box.dataset.authorUrl = script.authorUrl;
        box.dataset.authorAvatar = script.authorAvatar;
        box.dataset.stars = script.stars;
        box.addEventListener('click', showPopup);
        grid.appendChild(box);
    });
}

async function showPopup(event) {
    const box = event.currentTarget;
    popup.style.display = 'flex';

    // Header (5%)
    const header = document.querySelector('.popup-header');
    header.innerHTML = '';
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    const authorBtn = document.createElement('button');
    authorBtn.className = 'author-btn';
    const authorImg = document.createElement('img');
    authorImg.src = box.dataset.authorAvatar;
    authorBtn.appendChild(authorImg);
    authorBtn.appendChild(document.createTextNode(box.dataset.author));
    authorBtn.onclick = () => window.open(box.dataset.authorUrl, '_blank');
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    buttonGroup.appendChild(authorBtn);
    buttonGroup.appendChild(downloadBtn);
    buttonGroup.appendChild(copyBtn);
    header.appendChild(buttonGroup);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    header.appendChild(closeBtn);

    // Grid Box Replica (40%)
    let gridReplica = document.querySelector('.popup-grid-replica');
    if (!gridReplica) {
        gridReplica = document.createElement('div');
        gridReplica.className = 'popup-grid-replica';
        popup.querySelector('.popup-right').insertBefore(gridReplica, document.querySelector('.popup-scrollbox'));
    }
    gridReplica.innerHTML = `
        <img src="${box.dataset.jpgUrl}" alt="${box.dataset.name}">
        <div class="text-row">
            <div class="name">${box.dataset.name}</div>
            <div class="stars">⭐ ${box.dataset.stars}</div>
        </div>
    `;

    // Scrollbox (50%)
    const pyText = await (await fetch(box.dataset.pyUrl)).text();
    code.innerHTML = pyText;
    Prism.highlightElement(code);
    const txtText = box.dataset.txtUrl ? await (await fetch(box.dataset.txtUrl)).text() : 'No description available.';
    popupText.textContent = txtText;

    downloadBtn.onclick = () => downloadZip(pyText, txtText, box.dataset.name);
    copyBtn.onclick = () => copyZip(pyText, txtText, box.dataset.name);
    closeBtn.onclick = () => popup.style.display = 'none';
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
    const logoutBtn = document.getElementById('logout-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    let dropdownVisible = false;

    document.querySelector('.load-more').addEventListener('click', loadScripts);
    searchInput.addEventListener('input', renderGrid);

    loginBtn.addEventListener('click', async (e) => {
        if (loginBtn.classList.contains('profile')) {
            dropdownVisible = !dropdownVisible;
            profileDropdown.style.display = dropdownVisible ? 'block' : 'none';
        } else {
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

    document.addEventListener('click', (e) => {
        if (!loginBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.style.display = 'none';
            dropdownVisible = false;
        }
    });

    auth.checkSession((user) => {
        if (user) {
            auth.updateLoginDisplay(user, loginBtn);
            profileDropdown.style.display = 'none';
        } else {
            loginBtn.innerHTML = 'Login with GitHub';
            loginBtn.classList.remove('profile');
            loginBtn.disabled = false;
        }
    });

    loadScripts();
});