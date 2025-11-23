(function () {
    // --- Utility Functions (LocalStorage Handlers) ---
    function getUsers() {
        try { return JSON.parse(localStorage.getItem('users') || '[]'); } catch (e) { return []; }
    }
    function saveUsers(users) { localStorage.setItem('users', JSON.stringify(users)); }
    function setCurrentUser(user) { localStorage.setItem('currentUser', JSON.stringify(user)); }
    function getCurrentUser() { try { return JSON.parse(localStorage.getItem('currentUser')|| 'null'); } catch (e) { return null; } }
    function clearCurrentUser() { localStorage.removeItem('currentUser'); }
    function getPosts(){ try { return JSON.parse(localStorage.getItem('posts')||'[]'); } catch(e){ return []; } }
    function savePosts(p){ localStorage.setItem('posts', JSON.stringify(p)); }

    function showMsg(id, msg, ok) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg;
        el.style.color = ok ? 'green' : 'red';
        setTimeout(function(){ el.textContent = ''; }, 4000);
    }

    function escapeHtml(str){ if(!str) return ''; return String(str).replace(/[&<>"]+/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[m] || m; }); }

    // Global variable to track current sort state
    var currentSort = 'latest'; 

    // --- DARK / LIGHT MODE LOGIC ---
    function toggleDarkMode() {
        var html = document.documentElement;
        var isDark = html.classList.toggle('dark');
        var modeBtn = document.getElementById('mode-toggle-btn');
        var icon = modeBtn ? modeBtn.querySelector('i') : null;

        if (isDark) {
            localStorage.setItem('theme', 'dark');
            if (icon) { icon.classList.replace('fa-sun', 'fa-moon'); }
        } else {
            localStorage.setItem('theme', 'light');
            if (icon) { icon.classList.replace('fa-moon', 'fa-sun'); }
        }
    }

    function setupDarkModeToggle() {
        var modeToggleBtn = document.getElementById('mode-toggle-btn');
        var savedTheme = localStorage.getItem('theme');
        var html = document.documentElement;
        var icon = modeToggleBtn ? modeToggleBtn.querySelector('i') : null;

        // Apply saved theme or default to light if no preference
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            html.classList.add('dark');
            if (icon) { icon.classList.replace('fa-sun', 'fa-moon'); }
        } else {
            html.classList.remove('dark');
            if (icon) { icon.classList.replace('fa-moon', 'fa-sun'); }
        }
        
        // Add click listener for the toggle button
        if (modeToggleBtn) {
            modeToggleBtn.addEventListener('click', toggleDarkMode);
        }
    }

    // --- MAIN APPLICATION INITIALIZATION FUNCTION ---
    function initializeApp() {

        setupDarkModeToggle(); // Run Dark Mode Setup First

        // Signup handler (unchanged)
        var signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var name = (document.getElementById('signup-name')||{}).value || '';
                var email = ((document.getElementById('signup-email')||{}).value || '').toLowerCase();
                var password = (document.getElementById('signup-password')||{}).value || '';
                if (!name || !email || !password) { showMsg('signup-msg','Please fill all fields', false); return; }
                var users = getUsers();
                if (users.some(function(u){ return u.email === email; })) { showMsg('signup-msg','Email already registered', false); return; }
                var user = { name: name, email: email, password: password, created: Date.now() };
                users.push(user); saveUsers(users); setCurrentUser({ name: user.name, email: user.email });
                showMsg('signup-msg','Account created — redirecting...', true);
                setTimeout(function(){ location.href = 'feed.html'; }, 800);
            });
        }

        // Login handler (unchanged)
        var loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var email = ((document.getElementById('login-email')||{}).value || '').toLowerCase();
                var password = (document.getElementById('login-password')||{}).value || '';
                if (!email || !password) { showMsg('login-msg','Enter email and password', false); return; }
                var users = getUsers();
                var user = users.find(function(u){ return u.email === email && u.password === password; });
                if (!user) { showMsg('login-msg','Invalid credentials', false); return; }
                setCurrentUser({ name: user.name, email: user.email });
                showMsg('login-msg','Login successful — redirecting...', true);
                setTimeout(function(){ location.href = 'feed.html'; }, 600);
            });
        }

        // --- Feed page logic starts here (Requires Auth) ---
        var headerUser = document.getElementById('header-username');
        var logoutBtn = document.getElementById('profile-logout-menu');
        
        var profileToggleBtn = document.getElementById('profile-toggle-btn');
        var profileDropdownMenu = document.getElementById('profile-dropdown-menu');
        var editProfileMenuBtn = document.getElementById('profile-edit-menu'); 
        
        // NEW: Get Search Input element
        var searchInput = document.getElementById('search-input'); 

        if (headerUser || logoutBtn || document.getElementById('post-btn')) {
            var current = getCurrentUser();
            if (!current) { location.href = 'index.html'; return; }
            if (headerUser) headerUser.textContent = current.name || current.email;

            // render header avatar if present
            var headerAvatar = document.getElementById('header-avatar');
            function renderHeaderAvatar() {
                if (!headerAvatar) return;
                var users = getUsers();
                var me = users.find(function(u){ return u.email === current.email; });
                if (me && me.avatar) {
                    headerAvatar.innerHTML = '<img src="'+ me.avatar +'" alt="avatar" class="w-full h-full object-cover">';
                } else {
                    headerAvatar.textContent = (current.name||current.email||'U').charAt(0).toUpperCase();
                }
            }
            renderHeaderAvatar();

            // --- PROFILE DROPDOWN LOGIC (UNCHANGED) ---
            if (profileToggleBtn && profileDropdownMenu) {
                profileToggleBtn.addEventListener('click', function(e) {
                    e.stopPropagation(); 
                    profileDropdownMenu.classList.toggle('hidden');
                    profileToggleBtn.setAttribute('aria-expanded', profileDropdownMenu.classList.contains('hidden') ? 'false' : 'true');
                });
            }

            // Close dropdown on outside click
            document.addEventListener('click', function(e) {
                if (profileDropdownMenu && !profileDropdownMenu.classList.contains('hidden') && !profileToggleBtn.contains(e.target) && !profileDropdownMenu.contains(e.target)) {
                    profileDropdownMenu.classList.add('hidden');
                    profileToggleBtn.setAttribute('aria-expanded', 'false');
                }
            });

            // --- EDIT PROFILE MODAL LOGIC (UNCHANGED) ---
            var profileModal = document.getElementById('profile-modal');
            var profileName = document.getElementById('profile-name');
            var profileFile = document.getElementById('profile-avatar-file');
            var profilePreview = document.getElementById('profile-avatar-preview');
            var profileSave = document.getElementById('profile-save');
            var profileCancel = document.getElementById('profile-cancel');
            var profileDataUrl = null;

            function openProfileModal() {
                if (!profileModal) return;
                var users = getUsers();
                var me = users.find(function(u){ return u.email === current.email; });
                profileName.value = (me && me.name) || current.name || '';
                if (me && me.avatar) { profileDataUrl = me.avatar; profilePreview.innerHTML = '<img src="'+ me.avatar +'" class="w-full h-full object-cover">'; } else { profileDataUrl = null; profilePreview.innerHTML = ''; }
                profileModal.classList.remove('hidden');
                profileModal.classList.add('flex');
                if (profileDropdownMenu) {
                    profileDropdownMenu.classList.add('hidden');
                    profileToggleBtn.setAttribute('aria-expanded', 'false');
                }
            }

            function closeProfileModal() { if (!profileModal) return; profileModal.classList.add('hidden'); profileModal.classList.remove('flex'); }

            if (editProfileMenuBtn) editProfileMenuBtn.addEventListener('click', openProfileModal);
            
            if (profileCancel) profileCancel.addEventListener('click', closeProfileModal);
            if (profileFile) {
                profileFile.addEventListener('change', function(e){ var f = e.target.files && e.target.files[0]; if(!f) return; var r = new FileReader(); r.onload = function(ev){ profileDataUrl = ev.target.result; if(profilePreview) profilePreview.innerHTML = '<img src="'+ profileDataUrl +'" class="w-full h-full object-cover">'; }; r.readAsDataURL(f); });
            }

            if (profileSave) profileSave.addEventListener('click', function(){ 
                var newName = (profileName||{}).value || current.name; 
                var users = getUsers(); 
                var i = users.findIndex(function(u){ return u.email === current.email; }); 
                if (i>-1) { 
                    users[i].name = newName; 
                    if (profileDataUrl) users[i].avatar = profileDataUrl; 
                    saveUsers(users); 
                    setCurrentUser({ name: users[i].name, email: users[i].email }); 
                    current = getCurrentUser(); 
                    renderHeaderAvatar(); 
                    var posts = getPosts(); 
                    posts.forEach(function(p){ if(p.email === current.email) p.author = users[i].name; }); 
                    savePosts(posts); 
                    renderPosts(); 
                    closeProfileModal(); 
                }
            });
            
            if (logoutBtn) logoutBtn.addEventListener('click', function () { clearCurrentUser(); location.href = 'index.html'; });

            // Posts: create, render, like, delete (unchanged logic)
            function migratePosts() {
                var ps = getPosts();
                var changed = false;
                ps.forEach(function(p){
                    if (p && !p.reactions && p.likedBy) {
                        p.reactions = {};
                        (p.likedBy||[]).forEach(function(email){ p.reactions[email] = 'like'; });
                        delete p.likedBy; changed = true;
                    }
                });
                if (changed) savePosts(ps);
            }
            migratePosts();

            // Image file handling and post creation (unchanged)
            var imageFileInput = document.getElementById('post-image-file');
            var imageUrlInput = document.getElementById('post-image-url');
            var imagePreview = document.getElementById('image-preview');
            var selectedImageDataUrl = null;

            if (imageFileInput) {
                imageFileInput.addEventListener('change', function (e) {
                    var file = (e.target.files && e.target.files[0]);
                    if (!file) return;
                    var reader = new FileReader();
                    reader.onload = function (ev) {
                        selectedImageDataUrl = ev.target.result;
                        renderPreview(selectedImageDataUrl);
                    };
                    reader.readAsDataURL(file);
                });
            }

            function renderPreview(dataUrl) {
                if (!imagePreview) return;
                if (!dataUrl) { imagePreview.innerHTML = ''; return; }
                imagePreview.innerHTML = '<img src="'+ dataUrl +'" alt="preview" class="w-full rounded-md">';
            }

            var postBtn = document.getElementById('post-btn');
            if (postBtn) {
                postBtn.addEventListener('click', function () {
                    var text = (document.getElementById('post-text')||{}).value || '';
                    var imageUrl = (imageUrlInput||{}).value || '';
                    var imageData = selectedImageDataUrl || (imageUrl ? imageUrl : null);
                    if (!text && !imageData) { alert('Please add text or an image'); return; }
                    var posts = getPosts();
                    var post = { id: Date.now(), author: current.name || current.email, email: current.email, text: text, image: imageData, reactions: {}, comments: [], created: Date.now() };
                    posts.unshift(post); savePosts(posts);
                    (document.getElementById('post-text')||{}).value=''; if(imageUrlInput) imageUrlInput.value=''; selectedImageDataUrl=null; renderPreview(null);
                    renderPosts();
                });
            }

            // pending reactions for animation after re-render
            var pendingReacts = [];

            function processPendingReacts(){
                if (!pendingReacts || !pendingReacts.length) return;
                pendingReacts.forEach(function(item){
                    var sel = '.react-btn[data-id="'+ item.id +'"][data-reaction="'+ item.reaction +'"]';
                    var btn = document.querySelector(sel);
                    if (!btn) return;
                    var svg = btn.querySelector('svg');
                    var span = btn.querySelector('span');
                    // add animation class for CSS-driven pop
                    if (svg) svg.classList.add('react-pop');
                    if (span) span.classList.add('react-pop');
                    setTimeout(function(){ if (svg) svg.classList.remove('react-pop'); if (span) span.classList.remove('react-pop'); }, 300);
                });
                pendingReacts = [];
            }

            function renderPosts(){
                var container = document.getElementById('posts-container'); if(!container) return;
                var posts = getPosts(); 
                
                // --- NEW: SEARCH FILTERING LOGIC ---
                var searchTerm = (searchInput ? searchInput.value.toLowerCase() : '').trim();
                if (searchTerm) {
                    posts = posts.filter(function(p) {
                        // Check if search term is in post text or author name (case-insensitive)
                        var textMatch = p.text && p.text.toLowerCase().includes(searchTerm);
                        var authorMatch = p.author && p.author.toLowerCase().includes(searchTerm);
                        return textMatch || authorMatch;
                    });
                }
                
                if (currentSort === 'latest') {
                    posts.sort(function(a, b) { return b.created - a.created; });
                } else if (currentSort === 'oldest') {
                    posts.sort(function(a, b) { return a.created - b.created; });
                } else if (currentSort === 'mostLiked') {
                    posts.sort(function(a, b) {
                        var likesA = Object.keys(a.reactions || {}).length;
                        var likesB = Object.keys(b.reactions || {}).length;
                        return likesB - likesA;
                    });
                }

                container.innerHTML = '';
                var users = getUsers();
                posts.forEach(function(p){
                    var art = document.createElement('article');
                    art.className = 'bg-white rounded-lg shadow p-4 dark:bg-gray-800'; // Added dark class
                    var html = '';
                    html += '<div class="flex items-start justify-between gap-3">';
                    var authorUser = users.find(function(u){ return u.email === p.email; });
                    var avatarHtml = '';
                    if (authorUser && authorUser.avatar) {
                        avatarHtml = '<div class="w-10 h-10 rounded-full overflow-hidden"><img src="'+ escapeHtml(authorUser.avatar) +'" alt="avatar" class="w-full h-full object-cover"></div>';
                    } else {
                        avatarHtml = '<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">'+ (escapeHtml((p.author||'').charAt(0).toUpperCase()) || 'U') +'</div>';
                    }
                    html += '<div class="flex items-center gap-3">' + avatarHtml;
                    html += '<div><strong class="block dark:text-white">'+ escapeHtml(p.author) +'</strong> <small class="text-xs text-gray-500 dark:text-gray-400">· '+ new Date(p.created).toLocaleString() +'</small></div></div>';
                    html += '</div>';
                    html += '<div class="mt-3 text-gray-800 dark:text-gray-200">'+ escapeHtml(p.text) +'</div>'; // Added dark class
                    if (p.image) html += '<div class="mt-3"><img src="'+ escapeHtml(p.image) +'" alt="post image" class="w-full rounded-md"></div>';
                    html += '<div class="mt-3 flex items-center gap-3">';
                    var reacts = p.reactions || {};
                    var counts = { like:0, heart:0 };
                    Object.keys(reacts).forEach(function(email){ if (reacts[email] === 'heart') counts.heart++; else counts.like++; });
                    var userReaction = (current && reacts && reacts[current.email]) || null;
                    html += '<button class="react-btn px-2 py-1 rounded flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700" data-id="'+ p.id +'" data-reaction="like" aria-pressed="'+ (userReaction==='like'? 'true':'false') +'">';
                    html += '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 '+ (userReaction==='like'? 'text-blue-600':'text-gray-600 dark:text-gray-400') +'" viewBox="0 0 24 24" fill="currentColor"><path d="M2 10a2 2 0 012-2h4l1-4 1 4h6a2 2 0 012 2v7a2 2 0 01-2 2H9l-4 4V10z"/></svg>';
                    if (counts.like>0) html += '<span class="text-xs text-gray-600 dark:text-gray-400">'+ counts.like +'</span>';
                    html += '</button>';
                    html += '<button class="react-btn px-2 py-1 rounded flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700" data-id="'+ p.id +'" data-reaction="heart" aria-pressed="'+ (userReaction==='heart'? 'true':'false') +'">';
                    html += '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 '+ (userReaction==='heart'? 'text-red-500':'text-gray-600 dark:text-gray-400') +'" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
                    if (counts.heart>0) html += '<span class="text-xs text-gray-600 dark:text-gray-400">'+ counts.heart +'</span>';
                    html += '</button>';
                    html += '<div class="flex-1"></div>';
                    var isOwner = current && (p.email === current.email);
                    if (isOwner) {
                        html += '<button data-id="'+p.id+'" class="edit-btn bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-3 py-1 rounded dark:bg-yellow-900/50 dark:hover:bg-yellow-900 dark:text-yellow-300">Edit</button>';
                        html += '<button data-id="'+p.id+'" class="delete-btn bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded dark:bg-red-900/50 dark:hover:bg-red-900 dark:text-red-300">Delete</button>';
                    }
                    html += '</div>';
                    html += '<div class="mt-3 comments" data-id="'+ p.id +'">';
                    if (p.comments && p.comments.length) {
                        p.comments.forEach(function(c){ html += '<div class="text-sm text-gray-700 border-t pt-2 mt-2 dark:text-gray-300 dark:border-gray-700"><strong>'+ escapeHtml(c.author) +'</strong> <span class="text-xs text-gray-500 dark:text-gray-400">· '+ new Date(c.created).toLocaleString() +'</span><div>'+ escapeHtml(c.text) +'</div></div>'; });
                    }
                    html += '<div class="mt-2 flex gap-2"><input class="comment-input flex-1 px-3 py-2 border border-gray-200 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="Write a comment..." /> <button class="comment-btn bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">Reply</button></div>';
                    html += '</div>';
                    art.innerHTML = html; container.appendChild(art);
                });

                container.querySelectorAll('.react-btn').forEach(function(btn){ btn.addEventListener('click', function(){ var id = Number(btn.dataset.id); var reaction = btn.dataset.reaction; var posts = getPosts(); var i = posts.findIndex(function(x){ return x.id===id; }); if (i>-1){ posts[i].reactions = posts[i].reactions || {}; var currentReaction = posts[i].reactions[current.email]; if (currentReaction === reaction) { delete posts[i].reactions[current.email]; } else { posts[i].reactions[current.email] = reaction; } savePosts(posts); renderPosts(); } }); });
                
                container.querySelectorAll('.delete-btn').forEach(function(btn){ btn.addEventListener('click', function(){ 
                    if(!confirm('Delete this post? Are you sure?')) return; 
                    var id = Number(btn.dataset.id); 
                    var posts = getPosts(); 
                    var i = posts.findIndex(function(x){ return x.id===id; }); 
                    if(i>-1){ 
                        if(posts[i].email !== current.email){ 
                            alert('You can only delete your own posts'); 
                            return; 
                        } 
                        posts = posts.filter(function(x){ return x.id !== id; }); 
                        savePosts(posts); 
                        renderPosts(); 
                    } 
                }); });
                
                container.querySelectorAll('.comment-btn').forEach(function(btn){ btn.addEventListener('click', function(){ var card = btn.closest('article'); var id = Number(card.querySelector('.comments').dataset.id); var input = card.querySelector('.comment-input'); var text = input.value.trim(); if(!text) return; var posts = getPosts(); var i = posts.findIndex(function(x){ return x.id===id; }); if(i>-1){ posts[i].comments = posts[i].comments || []; posts[i].comments.push({ author: current.name||current.email, text: text, created: Date.now() }); savePosts(posts); renderPosts(); } }); });
                
                container.querySelectorAll('.edit-btn').forEach(function(btn){ btn.addEventListener('click', function(){ 
                    var id = Number(btn.dataset.id); 
                    var posts = getPosts(); 
                    var i = posts.findIndex(function(x){ return x.id===id; }); 
                    if(i===-1) return; 
                    
                    if(posts[i].email !== current.email){ 
                        alert('You can only edit your own posts'); 
                        return; 
                    } 
                    var newText = prompt('Edit your post text:', posts[i].text || ''); 
                    if(newText === null || newText.trim() === posts[i].text.trim()) return; // check for cancellation or no change
                    
                    posts[i].text = newText; 
                    savePosts(posts); 
                    renderPosts(); 
                }); });
                
            }
            
            if (searchInput) {
                searchInput.addEventListener('input', renderPosts);
            }


            function updateSortButtons(newSort) {
                document.querySelectorAll('.sort-btn').forEach(btn => {
                    btn.classList.remove('bg-blue-600', 'text-white', 'hover:bg-blue-700');
                    btn.classList.add('bg-gray-100', 'hover:bg-gray-200', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:hover:bg-gray-600');
                });
                
                var activeBtn = document.getElementById(newSort + '-sort');
                if (activeBtn) {
                    activeBtn.classList.remove('bg-gray-100', 'hover:bg-gray-200', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:hover:bg-gray-600');
                    activeBtn.classList.add('bg-blue-600', 'text-white', 'hover:bg-blue-700');
                }
            }

            document.getElementById('latest-sort').addEventListener('click', function() {
                currentSort = 'latest';
                updateSortButtons('latest');
                renderPosts();
            });
            document.getElementById('oldest-sort').addEventListener('click', function() {
                currentSort = 'oldest';
                updateSortButtons('oldest');
                renderPosts();
            });
            document.getElementById('mostLiked-sort').addEventListener('click', function() {
                currentSort = 'mostLiked';
                updateSortButtons('mostLiked');
                renderPosts();
            });

            setTimeout(function(){ processPendingReacts(); }, 60);
            renderPosts();
        }

    } 

    document.addEventListener('DOMContentLoaded', initializeApp);

})();