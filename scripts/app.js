(function () {
    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem('users') || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
    }

    function setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    }

    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('currentUser') || 'null');
        } catch (e) {
            return null;
        }
    }

    function clearCurrentUser() {
        localStorage.removeItem('currentUser');
    }

    function getPosts() {
        try {
            return JSON.parse(localStorage.getItem('posts') || '[]');
        } catch (e) {
            return [];
        }
    }

    function savePosts(p) {
        localStorage.setItem('posts', JSON.stringify(p));
    }

    function showMsg(id, msg, ok) {
        let el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg;
        el.style.color = ok ? 'green' : 'red';
        setTimeout(function () {
            el.textContent = '';
        }, 4000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"]+/g, function (m) {
            return ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;'
            })[m] || m;
        });
    }

    function autoResizeTextarea(el) {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
        if (el.scrollHeight < 40) el.style.height = '40px';
    }

    function toggleDarkMode() {
        let html = document.documentElement;
        let isDark = html.classList.toggle('dark');
        let modeBtn = document.getElementById('mode-toggle-btn');
        let icon = modeBtn ? modeBtn.querySelector('i') : null;

        // if (isDark) {
        //     localStorage.setItem('theme', 'dark');
        //     if (icon) {
        //         icon.classList.replace('fa-sun', 'fa-moon');
        //     }
        // } else {
        //     localStorage.setItem('theme', 'light');
        //     if (icon) {
        //         icon.classList.replace('fa-moon', 'fa-sun');
        //     }
        // }
    }

    function setupDarkModeToggle() {
        let modeToggleBtn = document.getElementById('mode-toggle-btn');
        let savedTheme = localStorage.getItem('theme');
        let html = document.documentElement;
        let icon = modeToggleBtn ? modeToggleBtn.querySelector('i') : null;

        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            html.classList.add('dark');
            if (icon) {
                icon.classList.replace('fa-sun', 'fa-moon');
            }
        } else {
            html.classList.remove('dark');
            if (icon) {
                icon.classList.replace('fa-moon', 'fa-sun');
            }
        }

        if (modeToggleBtn) {
            modeToggleBtn.addEventListener('click', toggleDarkMode);
        }
    }

    function migratePosts() {
        let ps = getPosts();
        let changed = false;
        ps.forEach(function (p) {
            if (p && !p.reactions && p.likedBy) {
                p.reactions = {};
                (p.likedBy || []).forEach(function (email) {
                    p.reactions[email] = 'like';
                });
                delete p.likedBy;
                changed = true;
            }
        });
        if (changed) savePosts(ps);
    }

    function setupAuthForms() {
        let signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', function (e) {
                e.preventDefault();
                let name = (document.getElementById('signup-name') || {}).value || '';
                let email = ((document.getElementById('signup-email') || {}).value || '').toLowerCase();
                let password = (document.getElementById('signup-password') || {}).value || '';
                if (!name || !email || !password) {
                    showMsg('signup-msg', 'Please fill all fields', false);
                    return;
                }
                let users = getUsers();
                if (users.some(function (u) {
                        return u.email === email;
                    })) {
                    showMsg('signup-msg', 'Email already registered', false);
                    return;
                }
                let user = {
                    name: name,
                    email: email,
                    password: password,
                    created: Date.now()
                };
                users.push(user);
                saveUsers(users);
                setCurrentUser({
                    name: user.name,
                    email: user.email
                });
                showMsg('signup-msg', 'Account created — redirecting...', true);
                setTimeout(function () {
                    location.href = 'feed.html';
                }, 800);
            });
        }

        let loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', function (e) {
                e.preventDefault();
                let email = ((document.getElementById('login-email') || {}).value || '').toLowerCase();
                let password = (document.getElementById('login-password') || {}).value || '';
                if (!email || !password) {
                    showMsg('login-msg', 'Enter email and password', false);
                    return;
                }
                let users = getUsers();
                let user = users.find(function (u) {
                    return u.email === email && u.password === password;
                });
                if (!user) {
                    showMsg('login-msg', 'Invalid credentials', false);
                    return;
                }
                setCurrentUser({
                    name: user.name,
                    email: user.email
                });
                showMsg('login-msg', 'Login successful — redirecting...', true);
                setTimeout(function () {
                    location.href = 'feed.html';
                }, 600);
            });
        }
    }

    let currentSort = 'latest';
    let selectedImageDataUrl = null;
    let pendingReacts = [];
    let current = getCurrentUser();

    function renderHeaderAvatar(currentUser) {
        let headerAvatar = document.getElementById('header-avatar');
        let createPostAvatar = document.getElementById('create-post-avatar');
        if (!headerAvatar && !createPostAvatar) return;
        let users = getUsers();
        let me = users.find(function (u) {
            return u.email === currentUser.email;
        });

        let avatarContent = '';
        if (me && me.avatar) {
            avatarContent = '<img src="' + me.avatar + '" alt="avatar" class="w-full h-full object-cover">';
        } else {
            avatarContent = (currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase();
        }

        if (headerAvatar) {
            headerAvatar.innerHTML = avatarContent;
            headerAvatar.className = (me && me.avatar) ?
                'w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold overflow-hidden' :
                'w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold';
        }

        if (createPostAvatar) {
            createPostAvatar.innerHTML = avatarContent;
            createPostAvatar.className = (me && me.avatar) ?
                'w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0 overflow-hidden' :
                'w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0';
        }
    }

    function setupProfileModal(currentUser) {
        let profileModal = document.getElementById('profile-modal');
        let editProfileMenuBtn = document.getElementById('profile-edit-menu');
        let profileName = document.getElementById('profile-name');
        let profileFile = document.getElementById('profile-avatar-file');
        let profilePreview = document.getElementById('profile-avatar-preview');
        let profileSave = document.getElementById('profile-save');
        let profileCancel = document.getElementById('profile-cancel');
        let profileDropdownMenu = document.getElementById('profile-dropdown-menu');
        let profileToggleBtn = document.getElementById('profile-toggle-btn');
        let profileDataUrl = null;

        function openProfileModal() {
            if (!profileModal) return;
            let users = getUsers();
            let me = users.find(function (u) {
                return u.email === currentUser.email;
            });
            profileName.value = (me && me.name) || currentUser.name || '';
            if (me && me.avatar) {
                profileDataUrl = me.avatar;
                profilePreview.innerHTML = '<img src="' + me.avatar + '" class="w-full h-full object-cover">';
            } else {
                profileDataUrl = null;
                profilePreview.innerHTML = '';
            }
            profileModal.classList.remove('hidden');
            profileModal.classList.add('flex');
            if (profileDropdownMenu) {
                profileDropdownMenu.classList.add('hidden');
                profileToggleBtn.setAttribute('aria-expanded', 'false');
            }
        }

        function closeProfileModal() {
            if (!profileModal) return;
            profileModal.classList.add('hidden');
            profileModal.classList.remove('flex');
        }

        if (editProfileMenuBtn) editProfileMenuBtn.addEventListener('click', openProfileModal);
        if (profileCancel) profileCancel.addEventListener('click', closeProfileModal);

        if (profileFile) {
            profileFile.addEventListener('change', function (e) {
                let f = e.target.files && e.target.files[0];
                if (!f) return;
                let r = new FileReader();
                r.onload = function (ev) {
                    profileDataUrl = ev.target.result;
                    if (profilePreview) profilePreview.innerHTML = '<img src="' + profileDataUrl + '" class="w-full h-full object-cover">';
                };
                r.readAsDataURL(f);
            });
        }

        if (profileSave) profileSave.addEventListener('click', function () {
            let newName = (profileName || {}).value || currentUser.name;
            let users = getUsers();
            let i = users.findIndex(function (u) {
                return u.email === currentUser.email;
            });
            if (i > -1) {
                users[i].name = newName;
                if (profileDataUrl) users[i].avatar = profileDataUrl;
                saveUsers(users);
                setCurrentUser({
                    name: users[i].name,
                    email: users[i].email
                });
                current = getCurrentUser();
                renderHeaderAvatar(current);
                let posts = getPosts();
                posts.forEach(function (p) {
                    if (p.email === current.email) p.author = users[i].name;
                });
                savePosts(posts);
                renderPosts();
                closeProfileModal();
            }
        });
    }

    function renderPreview(dataUrl) {
        let imagePreview = document.getElementById('image-preview');
        if (!imagePreview) return;
        if (!dataUrl) {
            imagePreview.innerHTML = '';
            return;
        }
        imagePreview.innerHTML = '<img src="' + dataUrl + '" alt="preview" class="w-full rounded-md">';
    }

    function setupPostCreation() {
        let postTextarea = document.getElementById('post-text');
        let imageFileInput = document.getElementById('post-image-file');
        let imageUrlInput = document.getElementById('post-image-url');
        let postBtn = document.getElementById('post-btn');

        if (postTextarea) {
            postTextarea.addEventListener('input', function () {
                autoResizeTextarea(this);
            });
            autoResizeTextarea(postTextarea);
        }

        if (imageFileInput) {
            imageFileInput.addEventListener('change', function (e) {
                let file = (e.target.files && e.target.files[0]);
                if (!file) return;
                let reader = new FileReader();
                reader.onload = function (ev) {
                    selectedImageDataUrl = ev.target.result;
                    renderPreview(selectedImageDataUrl);
                };
                reader.readAsDataURL(file);
            });
        }

        if (postBtn) {
            postBtn.addEventListener('click', function () {
                let text = (postTextarea || {}).value || '';
                let imageUrl = (imageUrlInput && imageUrlInput.value) || '';
                let imageData = selectedImageDataUrl || (imageUrl ? imageUrl : null);

                if (!text.trim() && !imageData) {
                    alert('Please add text or an image');
                    return;
                }

                let posts = getPosts();
                let post = {
                    id: Date.now(),
                    author: current.name || current.email,
                    email: current.email,
                    text: text.trim(),
                    image: imageData,
                    reactions: {},
                    comments: [],
                    created: Date.now()
                };
                posts.unshift(post);
                savePosts(posts);

                if (postTextarea) postTextarea.value = '';
                if (postTextarea) postTextarea.style.height = '40px';
                if (imageUrlInput) imageUrlInput.value = '';
                if (imageFileInput) imageFileInput.value = '';
                selectedImageDataUrl = null;
                renderPreview(null);
                renderPosts();
            });
        }
    }

    function processPendingReacts() {
        if (!pendingReacts || !pendingReacts.length) return;
        pendingReacts.forEach(function (item) {
            let sel = '.react-btn[data-id="' + item.id + '"][data-reaction="' + item.reaction + '"]';
            let btn = document.querySelector(sel);
            if (!btn) return;
            let svg = btn.querySelector('svg');
            let span = btn.querySelector('span');
            if (svg) svg.classList.add('react-pop');
            if (span) span.classList.add('react-pop');
            setTimeout(function () {
                if (svg) svg.classList.remove('react-pop');
                if (span) span.classList.remove('react-pop');
            }, 300);
        });
        pendingReacts = [];
    }

    function updateSortButtons(newSort) {
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white', 'hover:bg-blue-700');
            btn.classList.add('bg-gray-100', 'hover:bg-gray-200', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:hover:bg-gray-600');
        });

        let activeBtn = document.getElementById(newSort + '-sort');
        if (activeBtn) {
            activeBtn.classList.remove('bg-gray-100', 'hover:bg-gray-200', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:hover:bg-gray-600');
            activeBtn.classList.add('bg-blue-600', 'text-white', 'hover:bg-blue-700');
        }
    }

    function setupSortAndSearch() {
        let searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', renderPosts);
        }

        document.getElementById('latest-sort').addEventListener('click', function () {
            currentSort = 'latest';
            updateSortButtons('latest');
            renderPosts();
        });
        document.getElementById('oldest-sort').addEventListener('click', function () {
            currentSort = 'oldest';
            updateSortButtons('oldest');
            renderPosts();
        });
        document.getElementById('mostLiked-sort').addEventListener('click', function () {
            currentSort = 'mostLiked';
            updateSortButtons('mostLiked');
            renderPosts();
        });
        updateSortButtons(currentSort);
    }


    function renderPosts() {
        let container = document.getElementById('posts-container');
        if (!container) return;
        let posts = getPosts();
        let searchInput = document.getElementById('search-input');
        let searchTerm = (searchInput ? searchInput.value.toLowerCase() : '').trim();

        if (searchTerm) {
            posts = posts.filter(function (p) {
                let textMatch = p.text && p.text.toLowerCase().includes(searchTerm);
                let authorMatch = p.author && p.author.toLowerCase().includes(searchTerm);
                return textMatch || authorMatch;
            });
        }

        if (currentSort === 'latest') {
            posts.sort(function (a, b) {
                return b.created - a.created;
            });
        } else if (currentSort === 'oldest') {
            posts.sort(function (a, b) {
                return a.created - b.created;
            });
        } else if (currentSort === 'mostLiked') {
            posts.sort(function (a, b) {
                let likesA = Object.keys(a.reactions || {}).length;
                let likesB = Object.keys(b.reactions || {}).length;
                return likesB - likesA;
            });
        }

        container.innerHTML = '';
        let users = getUsers();

        posts.forEach(function (p) {
            let art = document.createElement('article');
            art.className = 'bg-white rounded-lg shadow p-4 dark:bg-gray-800';
            let html = '';
            let authorUser = users.find(function (u) {
                return u.email === p.email;
            });

            let avatarHtml = '';
            if (authorUser && authorUser.avatar) {
                avatarHtml = '<div class="w-10 h-10 rounded-full overflow-hidden"><img src="' + escapeHtml(authorUser.avatar) + '" alt="avatar" class="w-full h-full object-cover"></div>';
            } else {
                avatarHtml = '<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">' + (escapeHtml((p.author || '').charAt(0).toUpperCase()) || 'U') + '</div>';
            }

            html += '<div class="flex items-start justify-between gap-3">';
            html += '<div class="flex items-center gap-3">' + avatarHtml;
            html += '<div><strong class="block dark:text-white">' + escapeHtml(p.author) + '</strong> <small class="text-xs text-gray-500 dark:text-gray-400">· ' + new Date(p.created).toLocaleString() + '</small></div></div>';
            html += '</div>';

            html += '<div class="mt-3 text-gray-800 dark:text-gray-200">' + escapeHtml(p.text) + '</div>';
            if (p.image) html += '<div class="mt-3"><img src="' + escapeHtml(p.image) + '" alt="post image" class="w-full rounded-md"></div>';

            html += '<div class="mt-3 flex items-center gap-3">';
            let reacts = p.reactions || {};
            let counts = {
                like: 0,
                heart: 0
            };
            Object.keys(reacts).forEach(function (email) {
                if (reacts[email] === 'heart') counts.heart++;
                else counts.like++;
            });
            let userReaction = (current && reacts && reacts[current.email]) || null;

            html += '<button class="react-btn px-2 py-1 rounded flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700" data-id="' + p.id + '" data-reaction="like" aria-pressed="' + (userReaction === 'like' ? 'true' : 'false') + '">';
            html += '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ' + (userReaction === 'like' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400') + '" viewBox="0 0 24 24" fill="currentColor"><path d="M2 10a2 2 0 012-2h4l1-4 1 4h6a2 2 0 012 2v7a2 2 0 01-2 2H9l-4 4V10z"/></svg>';
            if (counts.like > 0) html += '<span class="text-xs text-gray-600 dark:text-gray-400">' + counts.like + '</span>';
            html += '</button>';

            html += '<button class="react-btn px-2 py-1 rounded flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700" data-id="' + p.id + '" data-reaction="heart" aria-pressed="' + (userReaction === 'heart' ? 'true' : 'false') + '">';
            html += '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ' + (userReaction === 'heart' ? 'text-red-500' : 'text-gray-600 dark:text-gray-400') + '" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
            if (counts.heart > 0) html += '<span class="text-xs text-gray-600 dark:text-gray-400">' + counts.heart + '</span>';
            html += '</button>';

            html += '<div class="flex-1"></div>';
            let isOwner = current && (p.email === current.email);
            if (isOwner) {
                html += '<button data-id="' + p.id + '" class="edit-btn bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-3 py-1 rounded dark:bg-yellow-900/50 dark:hover:bg-yellow-900 dark:text-yellow-300">Edit</button>';
                html += '<button data-id="' + p.id + '" class="delete-btn bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded dark:bg-red-900/50 dark:hover:bg-red-900 dark:text-red-300">Delete</button>';
            }
            html += '</div>';

            html += '<div class="mt-3 comments" data-id="' + p.id + '">';
            if (p.comments && p.comments.length) {
                p.comments.forEach(function (c) {
                    html += '<div class="text-sm text-gray-700 border-t pt-2 mt-2 dark:text-gray-300 dark:border-gray-700"><strong>' + escapeHtml(c.author) + '</strong> <span class="text-xs text-gray-500 dark:text-gray-400">· ' + new Date(c.created).toLocaleString() + '</span><div>' + escapeHtml(c.text) + '</div></div>';
                });
            }
            html += '<div class="mt-2 flex gap-2"><input class="comment-input flex-1 px-3 py-2 border border-gray-200 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="Write a comment..." /> <button class="comment-btn bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">Reply</button></div>';
            html += '</div>';

            art.innerHTML = html;
            container.appendChild(art);
        });

        container.querySelectorAll('.react-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                let id = Number(btn.dataset.id);
                let reaction = btn.dataset.reaction;
                let posts = getPosts();
                let i = posts.findIndex(function (x) {
                    return x.id === id;
                });
                if (i > -1) {
                    posts[i].reactions = posts[i].reactions || {};
                    let currentReaction = posts[i].reactions[current.email];
                    if (currentReaction === reaction) {
                        delete posts[i].reactions[current.email];
                    } else {
                        posts[i].reactions[current.email] = reaction;
                    }
                    savePosts(posts);
                    renderPosts();
                }
            });
        });

        container.querySelectorAll('.delete-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (!confirm('Delete this post? Are you sure?')) return;
                let id = Number(btn.dataset.id);
                let posts = getPosts();
                let i = posts.findIndex(function (x) {
                    return x.id === id;
                });
                if (i > -1) {
                    if (posts[i].email !== current.email) {
                        alert('You can only delete your own posts');
                        return;
                    }
                    posts = posts.filter(function (x) {
                        return x.id !== id;
                    });
                    savePosts(posts);
                    renderPosts();
                }
            });
        });

        container.querySelectorAll('.comment-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                let card = btn.closest('article');
                let id = Number(card.querySelector('.comments').dataset.id);
                let input = card.querySelector('.comment-input');
                let text = input.value.trim();
                if (!text) return;
                let posts = getPosts();
                let i = posts.findIndex(function (x) {
                    return x.id === id;
                });
                if (i > -1) {
                    posts[i].comments = posts[i].comments || [];
                    posts[i].comments.push({
                        author: current.name || current.email,
                        text: text,
                        created: Date.now()
                    });
                    savePosts(posts);
                    renderPosts();
                }
            });
        });

        container.querySelectorAll('.edit-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                let id = Number(btn.dataset.id);
                let posts = getPosts();
                let i = posts.findIndex(function (x) {
                    return x.id === id;
                });
                if (i === -1) return;

                if (posts[i].email !== current.email) {
                    alert('You can only edit your own posts');
                    return;
                }
                let newText = prompt('Edit your post text:', posts[i].text || '');
                if (newText === null || newText.trim() === posts[i].text.trim()) return;

                posts[i].text = newText;
                savePosts(posts);
                renderPosts();
            });
        });

    }

    function initializeApp() {

        setupDarkModeToggle();
        setupAuthForms();
        migratePosts();

        let headerUser = document.getElementById('header-username');
        let logoutBtn = document.getElementById('profile-logout-menu');

        if (headerUser || logoutBtn || document.getElementById('post-btn')) {
            if (!current) {
                location.href = 'index.html';
                return;
            }

            if (headerUser) headerUser.textContent = current.name || current.email;

            renderHeaderAvatar(current);
            setupProfileModal(current);
            setupPostCreation();
            setupSortAndSearch();

            if (logoutBtn) logoutBtn.addEventListener('click', function () {
                clearCurrentUser();
                location.href = 'index.html';
            });

            let profileToggleBtn = document.getElementById('profile-toggle-btn');
            let profileDropdownMenu = document.getElementById('profile-dropdown-menu');

            if (profileToggleBtn && profileDropdownMenu) {
                profileToggleBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    profileDropdownMenu.classList.toggle('hidden');
                    profileToggleBtn.setAttribute('aria-expanded', profileDropdownMenu.classList.contains('hidden') ? 'false' : 'true');
                });
            }

            document.addEventListener('click', function (e) {
                if (profileDropdownMenu && !profileDropdownMenu.classList.contains('hidden') && !profileToggleBtn.contains(e.target) && !profileDropdownMenu.contains(e.target)) {
                    profileDropdownMenu.classList.add('hidden');
                    profileToggleBtn.setAttribute('aria-expanded', 'false');
                }
            });

            renderPosts();
            setTimeout(function () {
                processPendingReacts();
            }, 60);

        }
    }

    document.addEventListener('DOMContentLoaded', initializeApp);

})();