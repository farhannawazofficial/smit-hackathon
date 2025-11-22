(function () {
	function getUsers() {
		try { return JSON.parse(localStorage.getItem('users') || '[]'); } catch (e) { return []; }
	}
	function saveUsers(users) { localStorage.setItem('users', JSON.stringify(users)); }
	function setCurrentUser(user) { localStorage.setItem('currentUser', JSON.stringify(user)); }
	function getCurrentUser() { try { return JSON.parse(localStorage.getItem('currentUser')|| 'null'); } catch (e) { return null; } }
	function clearCurrentUser() { localStorage.removeItem('currentUser'); }

	function showMsg(id, msg, ok) {
		var el = document.getElementById(id);
		if (!el) return;
		el.textContent = msg;
		el.style.color = ok ? 'green' : 'red';
		setTimeout(function(){ el.textContent = ''; }, 4000);
	}

	function escapeHtml(str){ if(!str) return ''; return String(str).replace(/[&<>"]+/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[m] || m; }); }

	document.addEventListener('DOMContentLoaded', function () {

		// Signup handler
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

		// Login handler
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

		// Feed page: require auth, show username, logout
		var headerUser = document.getElementById('header-username');
		var logoutBtn = document.getElementById('logout-btn');
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

			// Edit profile modal handlers
			var editBtn = document.getElementById('edit-profile-btn');
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
			}

			function closeProfileModal() { if (!profileModal) return; profileModal.classList.add('hidden'); profileModal.classList.remove('flex'); }

			if (editBtn) editBtn.addEventListener('click', openProfileModal);
			if (profileCancel) profileCancel.addEventListener('click', closeProfileModal);
			if (profileFile) {
				profileFile.addEventListener('change', function(e){ var f = e.target.files && e.target.files[0]; if(!f) return; var r = new FileReader(); r.onload = function(ev){ profileDataUrl = ev.target.result; if(profilePreview) profilePreview.innerHTML = '<img src="'+ profileDataUrl +'" class="w-full h-full object-cover">'; }; r.readAsDataURL(f); });
			}

			if (profileSave) profileSave.addEventListener('click', function(){ var newName = (profileName||{}).value || current.name; var users = getUsers(); var i = users.findIndex(function(u){ return u.email === current.email; }); if (i>-1) { users[i].name = newName; if (profileDataUrl) users[i].avatar = profileDataUrl; saveUsers(users); setCurrentUser({ name: users[i].name, email: users[i].email }); current = getCurrentUser(); renderHeaderAvatar(); // update posts authored by this user
				var posts = getPosts(); posts.forEach(function(p){ if(p.email === current.email) p.author = users[i].name; }); savePosts(posts); renderPosts(); closeProfileModal(); }
			});
			if (logoutBtn) logoutBtn.addEventListener('click', function () { clearCurrentUser(); location.href = 'index.html'; });

			// Posts: create, render, like, delete
			function getPosts(){ try { return JSON.parse(localStorage.getItem('posts')||'[]'); } catch(e){ return []; } }
			function savePosts(p){ localStorage.setItem('posts', JSON.stringify(p)); }

			// migrate older likedBy->reactions format
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

			// Image file handling and post creation
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
				var posts = getPosts(); container.innerHTML = '';
				var users = getUsers();
				posts.forEach(function(p){
					var art = document.createElement('article');
					art.className = 'bg-white rounded-lg shadow p-4';
					var html = '';
					html += '<div class="flex items-start justify-between gap-3">';
					// render avatar from users store when available
					var authorUser = users.find(function(u){ return u.email === p.email; });
					var avatarHtml = '';
					if (authorUser && authorUser.avatar) {
						avatarHtml = '<div class="w-10 h-10 rounded-full overflow-hidden"><img src="'+ escapeHtml(authorUser.avatar) +'" alt="avatar" class="w-full h-full object-cover"></div>';
					} else {
						avatarHtml = '<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">'+ (escapeHtml((p.author||'').charAt(0).toUpperCase()) || 'U') +'</div>';
					}
					html += '<div class="flex items-center gap-3">' + avatarHtml;
					html += '<div><strong class="block">'+ escapeHtml(p.author) +'</strong> <small class="text-xs text-gray-500">'+ new Date(p.created).toLocaleString() +'</small></div></div>';
					html += '</div>';
					html += '<div class="mt-3 text-gray-800">'+ escapeHtml(p.text) +'</div>';
					if (p.image) html += '<div class="mt-3"><img src="'+ escapeHtml(p.image) +'" alt="post image" class="w-full rounded-md"></div>';
					html += '<div class="mt-3 flex items-center gap-3">';
					// reactions counts
					var reacts = p.reactions || {};
					var counts = { like:0, heart:0 };
					Object.keys(reacts).forEach(function(email){ if (reacts[email] === 'heart') counts.heart++; else counts.like++; });
					var userReaction = (current && reacts && reacts[current.email]) || null;
					// like (thumb) button
					html += '<button class="react-btn px-2 py-1 rounded flex items-center gap-2" data-id="'+ p.id +'" data-reaction="like" aria-pressed="'+ (userReaction==='like'? 'true':'false') +'">';
					html += '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 '+ (userReaction==='like'? 'text-blue-600':'text-gray-600') +'" viewBox="0 0 24 24" fill="currentColor"><path d="M2 10a2 2 0 012-2h4l1-4 1 4h6a2 2 0 012 2v7a2 2 0 01-2 2H9l-4 4V10z"/></svg>';
					if (counts.like>0) html += '<span class="text-xs text-gray-600">'+ counts.like +'</span>';
					html += '</button>';
					// heart button
					html += '<button class="react-btn px-2 py-1 rounded flex items-center gap-2" data-id="'+ p.id +'" data-reaction="heart" aria-pressed="'+ (userReaction==='heart'? 'true':'false') +'">';
					html += '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 '+ (userReaction==='heart'? 'text-red-500':'text-gray-600') +'" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
					if (counts.heart>0) html += '<span class="text-xs text-gray-600">'+ counts.heart +'</span>';
					html += '</button>';
					html += '<div class="flex-1"></div>';
					html += '<button class="comment-toggle bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded" data-id="'+ p.id +'">\n<svg xmlns="http://www.w3.org/2000/svg" class="inline h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 4V5z"/></svg>Comment ('+ (p.comments? p.comments.length:0) +')</button>';
					html += '<button class="share-btn bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded" data-id="'+ p.id +'">\n<svg xmlns="http://www.w3.org/2000/svg" class="inline h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.83-4H9a3 3 0 100 6h3.17A3 3 0 1015 8zM4 13a3 3 0 106 0 3 3 0 00-6 0z"/></svg>Share</button>';
					// owner-only actions: edit + delete
					var isOwner = current && (p.email === current.email);
					if (isOwner) {
						html += '<button class="edit-btn bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-3 py-1 rounded" data-id="'+ p.id +'">Edit</button>';
						html += '<button class="delete-btn bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded" data-id="'+ p.id +'">Delete</button>';
					}
					html += '</div>';
					// comments area
					html += '<div class="mt-3 comments" data-id="'+ p.id +'">';
					if (p.comments && p.comments.length) {
						p.comments.forEach(function(c){ html += '<div class="text-sm text-gray-700 border-t pt-2 mt-2"><strong>'+ escapeHtml(c.author) +'</strong> <span class="text-xs text-gray-500">· '+ new Date(c.created).toLocaleString() +'</span><div>'+ escapeHtml(c.text) +'</div></div>'; });
					}
					html += '<div class="mt-2 flex gap-2"><input class="comment-input flex-1 px-3 py-2 border border-gray-200 rounded" placeholder="Write a comment..." /> <button class="comment-btn bg-blue-600 text-white px-3 py-2 rounded">Reply</button></div>';
					html += '</div>';
					art.innerHTML = html; container.appendChild(art);
				});

				// bind actions
				// reaction handling (like / heart)
				container.querySelectorAll('.react-btn').forEach(function(btn){ btn.addEventListener('click', function(){ var id = Number(btn.dataset.id); var reaction = btn.dataset.reaction; var posts = getPosts(); var i = posts.findIndex(function(x){ return x.id===id; }); if (i>-1){ posts[i].reactions = posts[i].reactions || {}; var currentReaction = posts[i].reactions[current.email]; if (currentReaction === reaction) { // toggle off
						delete posts[i].reactions[current.email];
					} else {
						posts[i].reactions[current.email] = reaction;
					}
					savePosts(posts); renderPosts(); } }); });
				container.querySelectorAll('.delete-btn').forEach(function(btn){ btn.addEventListener('click', function(){ if(!confirm('Delete this post?')) return; var id = Number(btn.dataset.id); var posts = getPosts(); var i = posts.findIndex(function(x){ return x.id===id; }); if(i>-1){ if(posts[i].email !== current.email){ alert('You can only delete your own posts'); return; } posts = posts.filter(function(x){ return x.id !== id; }); savePosts(posts); renderPosts(); } }); });
				// comment toggle and submit
				container.querySelectorAll('.comment-btn').forEach(function(btn){ btn.addEventListener('click', function(){ var card = btn.closest('article'); var id = Number(card.querySelector('.comments').dataset.id); var input = card.querySelector('.comment-input'); var text = input.value.trim(); if(!text) return; var posts = getPosts(); var i = posts.findIndex(function(x){ return x.id===id; }); if(i>-1){ posts[i].comments = posts[i].comments || []; posts[i].comments.push({ author: current.name||current.email, text: text, created: Date.now() }); savePosts(posts); renderPosts(); } }); });
				// edit post (owner only) - prompt-based edit
				container.querySelectorAll('.edit-btn').forEach(function(btn){ btn.addEventListener('click', function(){ var id = Number(btn.dataset.id); var posts = getPosts(); var i = posts.findIndex(function(x){ return x.id===id; }); if(i===-1) return; if(posts[i].email !== current.email){ alert('You can only edit your own posts'); return; } var newText = prompt('Edit your post text:', posts[i].text || ''); if(newText === null) return; posts[i].text = newText; savePosts(posts); renderPosts(); }); });
				// share (copy to clipboard)
				container.querySelectorAll('.share-btn').forEach(function(btn){ btn.addEventListener('click', function(){ var id = Number(btn.dataset.id); var posts = getPosts(); var p = posts.find(function(x){ return x.id===id; }); if(!p) return; var text = p.author + '\n' + p.text + (p.image ? '\n' + p.image : ''); try { navigator.clipboard.writeText(text); alert('Post copied to clipboard'); } catch(e){ alert('Copy not available'); } }); });
			}

			// run animations shortly after render to ensure elements exist
			setTimeout(function(){ processPendingReacts(); }, 60);
			renderPosts();
		}

	});

})();
