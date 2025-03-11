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
                        authorAvatar: repo.owner.avatar_url,
                        repoName: repo.name,
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

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 5000);
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
                <div class="stars"><span class="star-icon"></span> ${script.stars}</div>
            </div>
        `;
        box.dataset.pyUrl = script.pyUrl;
        box.dataset.txtUrl = script.txtUrl;
        box.dataset.jpgUrl = script.jpgUrl;
        box.dataset.name = script.name;
        box.dataset.author = script.author;
        box.dataset.authorUrl = script.authorUrl;
        box.dataset.authorAvatar = script.authorAvatar;
        box.dataset.repoName = script.repoName;
        box.dataset.stars = script.stars;
        box.addEventListener('click', showPopup);
        grid.appendChild(box);
    });
}

async function showPopup(event) {
    const box = event.currentTarget;
    popup.style.display = 'flex';

    const header = document.querySelector('.popup-header');
    header.innerHTML = '';
    const leftGroup = document.createElement('div');
    leftGroup.className = 'left-button-group';
    const authorBtn = document.createElement('button');
    authorBtn.className = 'author-btn';
    const authorImg = document.createElement('img');
    authorImg.src = box.dataset.authorAvatar;
    authorBtn.appendChild(authorImg);
    authorBtn.appendChild(document.createTextNode(box.dataset.author));
    authorBtn.onclick = () => window.open(box.dataset.authorUrl, '_blank');
    leftGroup.appendChild(authorBtn);

    let creatorLinks = {};
    try {
        const linksResponse = await fetch(`https://api.github.com/repos/${box.dataset.author}/bebtools/contents/links.json`, {
            headers: auth.getToken() ? { 'Authorization': `token ${auth.getToken()}` } : {}
        });
        if (linksResponse.ok) {
            const linksData = await linksResponse.json();
            creatorLinks = JSON.parse(atob(linksData.content));
            if (creatorLinks.website) {
                const websiteBtn = document.createElement('button');
                websiteBtn.className = 'website-btn';
                websiteBtn.onclick = () => window.open(creatorLinks.website, '_blank');
                leftGroup.appendChild(websiteBtn);
            }
            if (creatorLinks.x) {
                const xBtn = document.createElement('button');
                xBtn.className = 'x-btn';
                xBtn.onclick = () => window.open(creatorLinks.x, '_blank');
                leftGroup.appendChild(xBtn);
            }
            if (creatorLinks.donation) {
                const donationBtn = document.createElement('button');
                donationBtn.className = 'donation-btn';
                donationBtn.textContent = 'Tip Creator';
                donationBtn.onclick = () => window.open(creatorLinks.donation, '_blank');
                leftGroup.appendChild(donationBtn);
            }
        }
    } catch (error) {
        console.log('No creator links found or error fetching:', error);
    }

    header.appendChild(leftGroup);

    const rightGroup = document.createElement('div');
    rightGroup.className = 'right-button-group';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    rightGroup.appendChild(closeBtn);
    header.appendChild(rightGroup);

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
            <div class="action-buttons">
                <button class="download-btn"></button>
                <button class="copy-btn"></button>
                <button class="star-btn">${box.dataset.stars}</button>
            </div>
        </div>
    `;

    const downloadBtn = gridReplica.querySelector('.download-btn');
    const copyBtn = gridReplica.querySelector('.copy-btn');
    const starBtn = gridReplica.querySelector('.star-btn');
    const pyText = await (await fetch(box.dataset.pyUrl)).text();
    const txtText = box.dataset.txtUrl ? await (await fetch(box.dataset.txtUrl)).text() : 'No description available.';

    downloadBtn.onclick = () => downloadZip(pyText, txtText, box.dataset.name);
    copyBtn.onclick = () => copyZip(box);
    closeBtn.onclick = () => popup.style.display = 'none';

    const token = auth.getToken();
    if (token) {
        let isStarred = false;
        try {
            const starCheck = await fetch(`https://api.github.com/user/starred/${box.dataset.author}/${box.dataset.repoName}`, {
                headers: { 'Authorization': `token ${token}` }
            });
            if (starCheck.status === 401) throw new Error('Token invalid or expired');
            isStarred = starCheck.status === 204;
        } catch (error) {
            console.error('Error checking star status:', error);
            starBtn.disabled = true;
        }

        starBtn.classList.toggle('starred', isStarred);
        starBtn.onclick = async () => {
            try {
                if (isStarred) {
                    await fetch(`https://api.github.com/user/starred/${box.dataset.author}/${box.dataset.repoName}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `token ${token}` }
                    });
                    isStarred = false;
                    starBtn.classList.remove('starred');
                    box.dataset.stars = parseInt(box.dataset.stars) - 1;
                } else {
                    await fetch(`https://api.github.com/user/starred/${box.dataset.author}/${box.dataset.repoName}`, {
                        method: 'PUT',
                        headers: { 'Authorization': `token ${token}` }
                    });
                    isStarred = true;
                    starBtn.classList.add('starred');
                    box.dataset.stars = parseInt(box.dataset.stars) + 1;
                }
                starBtn.textContent = box.dataset.stars;
            } catch (error) {
                console.error('Error toggling star:', error);
                showNotification('Failed to star/unstar the repository.');
            }
        };
    } else {
        starBtn.disabled = true;
    }

    code.innerHTML = pyText;
    Prism.highlightElement(code);
    popupText.textContent = txtText;
}

async function downloadZip(pyText, txtText, scriptName) {
    const zip = new JSZip();
    zip.file(`${scriptName}.py`, pyText);
    if (txtText) zip.file(`${scriptName}.txt`, txtText);
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scriptName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('Script downloaded!');
}

async function copyZip(box) {
    const urls = [box.dataset.pyUrl];
    if (box.dataset.txtUrl) urls.push(box.dataset.txtUrl);
    const urlText = urls.join('\n');
    await navigator.clipboard.writeText(urlText);
    showNotification('Copied to Clipboard! Paste into Beb.Tools Blender Plugin.');
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    let dropdownVisible = false;

    document.querySelector('.load-more').addEventListener('click', loadScripts);
    searchInput.addEventListener('input', renderGrid);

    loginBtn.addEventListener('click', async (e) => {
        if (loginBtn.className.includes('profile')) {
            dropdownVisible = !dropdownVisible;
            profileDropdown.style.display = dropdownVisible ? 'block' : 'none';
        } else {
            const error = await auth.loginWithGitHub();
            if (error) showNotification(`Login failed: ${error}`);
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        loginBtn.innerHTML = 'Login with GitHub';
        loginBtn.className = loginBtn.className.replace('profile', '');
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

    auth.checkSession(async (user) => {
        if (user && auth.getToken()) {
            try {
                const response = await fetch('https://api.github.com/user', {
                    headers: { 'Authorization': `token ${auth.getToken()}` }
                });
                if (!response.ok) throw new Error('Token invalid or expired');
                auth.updateLoginDisplay(user, loginBtn);
                profileDropdown.style.display = 'none';
            } catch (error) {
                console.error('Token validation failed:', error);
                loginBtn.innerHTML = 'Login with GitHub';
                loginBtn.className = loginBtn.className.replace('profile', '');
                loginBtn.disabled = false;
            }
        } else {
            loginBtn.innerHTML = 'Login with GitHub';
            loginBtn.className = loginBtn.className.replace('profile', '');
            loginBtn.disabled = false;
        }
    });

    loadScripts();
});