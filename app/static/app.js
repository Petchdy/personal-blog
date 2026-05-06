const app = document.querySelector("#app");
const TOKEN_KEY = "journal_admin_token";
const DEFAULT_HERO = "https://lh3.googleusercontent.com/aida-public/AB6AXuAC5Mo3Asy13yTSOrsUR4cwMgGYpg3HEXgYHPGcmcqaPtbzyF5Vm_P4cCuUrcJVcwh19GuVwuEFWpkts2ra2bVyEcX1iTljPuBekhbKh-s2yAPcuo38oQWAaLXQpiBrM6tKJWNceX6k-jRKPS8Hrrs2q0FjbWJwtjG139l47gUhY2waJ2M4F45hMZFvVhG6dtkDLq09-y_OxTqnxTzm4u89tsL7ASdOL6LHDJxlgiJxrQLdnqzbEcNvf65V-vRQT6ZexzIQJL_6z9Hk";
const DEFAULT_COVER = "https://lh3.googleusercontent.com/aida-public/AB6AXuCzvCBXK8jJiRIeT_6ZsQ9AIoR8-9atGEIg2RUdPlP3xyvwQDihqR3MFoEp8jtuuz2pWr9yu3lraELwHRI1sbOce2-GgiZudkd_QW6bLxUUmxpCGGfq_jIx9FuTvJ2vj7Gaf0nWr3IeY87XzJe1T36M6juKZp50ZDH8F8AB38BCoXU6OgCxxhsuDX6nDEe8_MWaX37j5twzsXTdLKgMCESZMJMKdfYeIzwPZEIjZe12um7skp8lmM51LDlwj48gXvA6LjaGLvZUWi7Q";

let state = {
  page: 1,
  posts: [],
  selected: null,
  adminView: "editor",
  siteSettings: null,
  token: localStorage.getItem(TOKEN_KEY),
};

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function fmtDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function readTime(text = "") {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function tags(post) {
  return (post.tags || []).map((tag) => tag.name);
}

function primaryTag(post) {
  return tags(post)[0] || (post.published ? "Essay" : "Draft");
}

function excerpt(text = "", size = 170) {
  const plain = text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > size ? `${plain.slice(0, size).trim()}...` : plain;
}

function inlineMd(text = "") {
  return escapeHtml(text)
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function markdownToHtml(markdown = "") {
  const blocks = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      blocks.push(`<h${level}>${inlineMd(line.replace(/^#{1,3}\s/, ""))}</h${level}>`);
      i += 1;
      continue;
    }

    if (line.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push(`<blockquote>${inlineMd(quote.join(" "))}</blockquote>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inlineMd(lines[i].replace(/^\d+\.\s+/, ""))}</li>`);
        i += 1;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inlineMd(lines[i].replace(/^[-*]\s+/, ""))}</li>`);
        i += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^#{1,3}\s/.test(lines[i]) && !lines[i].startsWith(">") && !/^\d+\.\s+/.test(lines[i]) && !/^[-*]\s+/.test(lines[i]) && !lines[i].startsWith("```")) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push(`<p>${inlineMd(paragraph.join(" "))}</p>`);
  }

  return blocks.join("");
}

async function request(path, options = {}) {
  const headers = options.headers || {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const res = await fetch(path, { ...options, headers });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

function shell(content, active = "essays") {
  return `
    <header class="topbar">
      <nav class="nav">
        <a class="brand" href="/" data-link>Journal</a>
        <div class="nav-links">
          <a class="nav-link ${active === "essays" ? "active" : ""}" href="/" data-link data-scroll-top>Home</a>
          <a class="nav-link" href="#about" data-scroll-about>About</a>
        </div>
        <a class="button primary" href="/admin" data-link>Admin</a>
      </nav>
    </header>
    ${content}
    <footer id="about" class="footer">
      <div class="footer-brand">Journal</div>
      <div class="footer-links">
        <a class="meta" href="/">Contact</a>
      </div>
      <p class="meta">2026 Journal. Built for the written word.</p>
    </footer>
  `;
}

async function renderHome() {
  app.innerHTML = shell(`<main><section class="hero"><div class="hero-copy"><h1 class="display">Loading journal...</h1></div><section class="feed"><p class="meta">Loading essays...</p></section></main>`);
  const [settings, data] = await Promise.all([
    request("/settings/site"),
    request(`/posts?page=${state.page}&page_size=10`),
  ]);
  state.siteSettings = settings;
  const posts = data.items || [];
  const featured = posts.find((post) => post.cover_image_url) || posts[0];
  const heroImage = settings.hero_image_url || featured?.cover_image_url || DEFAULT_HERO;
  const feed = posts.length
    ? posts.map((post) => `
        <article class="post-row" data-open-post="${escapeHtml(post.slug)}">
          <div class="post-row-head">
            <span class="chip">${escapeHtml(primaryTag(post))}</span>
            <span class="meta">${fmtDate(post.created_at)} · ${readTime(post.content || post.title)}</span>
          </div>
          <h2>${escapeHtml(post.title)}</h2>
          <p>${escapeHtml(excerpt(post.content || "Open this essay to read the full entry."))}</p>
        </article>
      `).join("")
    : `<div class="empty-band center"><div class="narrow"><h2 class="section-title">No published essays yet.</h2><p class="dek">Sign in to the admin panel and publish your first post.</p><p style="margin-top:32px"><a class="button primary" href="/admin" data-link>Write an Essay</a></p></div></div>`;

  app.innerHTML = shell(`
    <main>
      <section class="hero">
        <div class="hero-copy">
          <h1 class="display">${escapeHtml(settings.hero_title)}</h1>
          <p class="dek">${escapeHtml(settings.hero_subtitle)}</p>
        </div>
        <div class="hero-image"><img src="${heroImage}" alt="Featured journal image" /></div>
      </section>
      <section class="feed">
        ${feed}
        ${data.pages > 1 ? `<div class="pagination"><button class="button" data-page="${state.page - 1}" ${state.page <= 1 ? "disabled" : ""}>Previous</button><button class="button" data-page="${state.page + 1}" ${state.page >= data.pages ? "disabled" : ""}>Next</button></div>` : ""}
      </section>
    </main>
  `);
}

async function renderPost(slug) {
  app.innerHTML = shell(`<main class="article-body"><p class="meta">Loading essay...</p></main>`);
  const post = await request(`/posts/${slug}`);
  document.title = `${post.title} · Journal`;
  const postTags = tags(post);
  app.innerHTML = shell(`
    <main>
      <section class="article-hero">
        <p class="meta">${escapeHtml(postTags.join(" · ").toUpperCase() || "ESSAY")} · ${readTime(post.content)}</p>
        <h1 class="display">${escapeHtml(post.title)}</h1>
        <p class="dek">${escapeHtml(excerpt(post.content, 130))}</p>
        <div class="byline"><span class="avatar"><span class="material-symbols-outlined">person</span></span><span class="meta">Admin<br />${fmtDate(post.created_at)}</span></div>
      </section>
      <section class="cover-frame">
        <figure>
          <div class="image-box"><img src="${post.cover_image_url || DEFAULT_COVER}" alt="${escapeHtml(post.title)} cover image" /></div>
          <figcaption>Figure 01. A visual note from the essay.</figcaption>
        </figure>
      </section>
      <article class="article-body">
        ${markdownToHtml(post.content || "This essay is intentionally spare for now.")}
        <div class="article-tags">${postTags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}</div>
      </article>
    </main>
  `);
}

function renderLogin(message = "") {
  document.title = "Admin · Journal";
  app.innerHTML = `
    <main class="login-shell">
      <section class="login-card">
        <div class="login-title"><h1>Journal</h1><p class="meta">ADMINISTRATIVE ACCESS</p></div>
        <div class="panel">
          <form data-login>
            <label class="field"><span class="field-label">Username</span><input class="input" name="username" autocomplete="username" placeholder="your.name" required /></label>
            <label class="field"><span class="field-label">Password</span><input class="input" name="password" type="password" autocomplete="current-password" placeholder="password" required /></label>
            <button class="button primary" type="submit" style="width:100%">Sign In <span class="material-symbols-outlined">login</span></button>
            <p class="status ${message ? "error" : ""}" data-login-status>${escapeHtml(message)}</p>
          </form>
        </div>
        <p class="center" style="margin-top:32px"><a class="nav-link" href="/" data-link>Back to Site</a></p>
      </section>
    </main>
  `;
}

function blankPost() {
  return { id: null, title: "", content: "", cover_image_url: "", published: false, tags: [] };
}

async function renderAdmin() {
  if (!state.token) {
    renderLogin();
    return;
  }
  app.innerHTML = `<main class="admin-layout"><section class="post-list-pane"><p class="meta">Loading workspace...</p></section></main>`;
  try {
    const data = await request("/posts/admin?page=1&page_size=100");
    state.posts = data.items || [];
    state.selected = state.selected || state.posts[0] || blankPost();
    renderAdminLayout();
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    state.token = null;
    renderLogin("Please sign in again.");
  }
}

function adminPostCard(post) {
  const active = state.selected?.id === post.id ? "active" : "";
  return `
    <article class="admin-post-card ${active}" data-edit-post="${post.id}">
      <div class="post-row-head"><span class="chip">${post.published ? "Published" : "Draft"}</span><span class="meta">${fmtDate(post.updated_at || post.created_at)}</span></div>
      <h3>${escapeHtml(post.title)}</h3>
      <p class="meta">${escapeHtml(excerpt(post.content, 96) || "No content yet.")}</p>
    </article>
  `;
}

function renderAdminLayout() {
  if (state.adminView === "site") {
    app.innerHTML = `<main class="admin-layout"><section class="post-list-pane"><p class="meta">Loading site settings...</p></section></main>`;
    renderSiteSettingsLayout();
    return;
  }

  if (state.adminView === "settings") {
    renderSettingsLayout();
    return;
  }

  const post = state.selected || blankPost();
  const wordCount = (post.content || "").trim().split(/\s+/).filter(Boolean).length;
  app.innerHTML = `
    <main class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-title"><h1>Admin Panel</h1><p class="meta">Manage Journal</p></div>
        <nav class="admin-menu">
          <button type="button" class="active"><span class="material-symbols-outlined">dashboard</span><span>Dashboard</span></button>
          <button type="button" data-new-post><span class="material-symbols-outlined">edit_note</span><span>New Draft</span></button>
          <button type="button" data-site-settings><span class="material-symbols-outlined">web</span><span>Site</span></button>
          <button type="button" data-site><span class="material-symbols-outlined">public</span><span>View Site</span></button>
          <button type="button" data-settings><span class="material-symbols-outlined">settings</span><span>Settings</span></button>
        </nav>
        <button class="admin-user" type="button" data-logout><span class="avatar"><span class="material-symbols-outlined">person</span></span><span><strong>Admin</strong><br /><span class="meta">Sign Out</span></span></button>
      </aside>
      <section class="post-list-pane">
        <div class="pane-head"><h2>Recent Work</h2><span class="material-symbols-outlined">filter_list</span></div>
        <div class="admin-post-list">${state.posts.length ? state.posts.map(adminPostCard).join("") : `<p class="meta">No posts yet. Start with a new draft.</p>`}</div>
      </section>
      <section class="editor-pane">
        <form data-editor>
          <div class="toolbar">
            <div class="toolbar-group">
              <label class="small-action"><span class="material-symbols-outlined">image</span><span>Media</span><input class="hidden" type="file" accept="image/*" data-upload /></label>
              <button class="small-action" type="button" data-insert-link><span class="material-symbols-outlined">link</span><span>Link</span></button>
              <button class="small-action" type="button" data-insert-code><span class="material-symbols-outlined">code</span><span>Markdown</span></button>
            </div>
            <div class="toolbar-group">
              ${post.id ? `<button class="button danger" type="button" data-delete>Delete</button>` : ""}
              <button class="button" type="submit" data-save-draft>Save Draft</button>
              <button class="button primary" type="submit" data-publish>Publish</button>
            </div>
          </div>
          <div class="editor-scroll">
            <input class="title-input" name="title" placeholder="Entry Title" value="${escapeHtml(post.title)}" required />
            <div class="editor-grid">
              <input class="input" name="tags" placeholder="design, minimalism" value="${escapeHtml(tags(post).join(", "))}" />
              <label class="small-action"><input name="published" type="checkbox" ${post.published ? "checked" : ""} /> Published</label>
            </div>
            <input class="input" name="cover_image_url" placeholder="Cover image URL" value="${escapeHtml(post.cover_image_url || "")}" />
            <textarea class="textarea" name="content" placeholder="Begin your essay here...">${escapeHtml(post.content || "")}</textarea>
            <p class="status" data-editor-status></p>
          </div>
        </form>
      </section>
    </main>
    <footer class="admin-footer">
      <div class="toolbar-group"><span class="meta">Words: ${wordCount}</span><span class="meta">Read Time: ${readTime(post.content || "")}</span></div>
      <a class="small-action" href="${post.slug ? `/post/${post.slug}` : "/"}" data-link><span class="material-symbols-outlined">visibility</span><span>Preview</span></a>
    </footer>
  `;
}

function renderSettingsLayout() {
  app.innerHTML = `
    <main class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-title"><h1>Admin Panel</h1><p class="meta">Manage Journal</p></div>
        <nav class="admin-menu">
          <button type="button" data-dashboard><span class="material-symbols-outlined">dashboard</span><span>Dashboard</span></button>
          <button type="button" data-new-post><span class="material-symbols-outlined">edit_note</span><span>New Draft</span></button>
          <button type="button" data-site-settings><span class="material-symbols-outlined">web</span><span>Site</span></button>
          <button type="button" data-site><span class="material-symbols-outlined">public</span><span>View Site</span></button>
          <button type="button" class="active"><span class="material-symbols-outlined">settings</span><span>Settings</span></button>
        </nav>
        <button class="admin-user" type="button" data-logout><span class="avatar"><span class="material-symbols-outlined">person</span></span><span><strong>Admin</strong><br /><span class="meta">Sign Out</span></span></button>
      </aside>
      <section class="post-list-pane">
        <div class="pane-head"><h2>Security</h2><span class="material-symbols-outlined">lock</span></div>
        <p class="meta">Change the single admin account password. Passwords are stored as bcrypt hashes, never as plain text.</p>
      </section>
      <section class="editor-pane">
        <div class="editor-scroll">
          <h1 class="title-input" style="margin-bottom:12px">Change Password</h1>
          <p class="dek" style="font-size:1.05rem;margin-bottom:48px">Use at least 12 characters. After a successful change, you will sign in again with the new password.</p>
          <form class="panel" data-change-password>
            <label class="field"><span class="field-label">Current Password</span><input class="input" name="current_password" type="password" autocomplete="current-password" required /></label>
            <label class="field"><span class="field-label">New Password</span><input class="input" name="new_password" type="password" autocomplete="new-password" minlength="12" maxlength="72" required /></label>
            <label class="field"><span class="field-label">Confirm New Password</span><input class="input" name="confirm_password" type="password" autocomplete="new-password" minlength="12" maxlength="72" required /></label>
            <button class="button primary" type="submit">Update Password</button>
            <p class="status" data-password-status></p>
          </form>
        </div>
      </section>
    </main>
  `;
}

async function renderSiteSettingsLayout() {
  const settings = state.siteSettings || await request("/settings/site");
  state.siteSettings = settings;

  app.innerHTML = `
    <main class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-title"><h1>Admin Panel</h1><p class="meta">Manage Journal</p></div>
        <nav class="admin-menu">
          <button type="button" data-dashboard><span class="material-symbols-outlined">dashboard</span><span>Dashboard</span></button>
          <button type="button" data-new-post><span class="material-symbols-outlined">edit_note</span><span>New Draft</span></button>
          <button type="button" class="active"><span class="material-symbols-outlined">web</span><span>Site</span></button>
          <button type="button" data-site><span class="material-symbols-outlined">public</span><span>View Site</span></button>
          <button type="button" data-settings><span class="material-symbols-outlined">settings</span><span>Settings</span></button>
        </nav>
        <button class="admin-user" type="button" data-logout><span class="avatar"><span class="material-symbols-outlined">person</span></span><span><strong>Admin</strong><br /><span class="meta">Sign Out</span></span></button>
      </aside>
      <section class="post-list-pane">
        <div class="pane-head"><h2>Homepage</h2><span class="material-symbols-outlined">web</span></div>
        <p class="meta">Edit the main headline, supporting sentence, and hero image shown on the public homepage.</p>
      </section>
      <section class="editor-pane">
        <div class="editor-scroll">
          <h1 class="title-input" style="margin-bottom:12px">Site Settings</h1>
          <form class="panel" data-site-settings-form>
            <label class="field"><span class="field-label">Hero Title</span><input class="input" name="hero_title" value="${escapeHtml(settings.hero_title)}" required /></label>
            <label class="field"><span class="field-label">Hero Subtitle</span><textarea class="textarea compact" name="hero_subtitle" required>${escapeHtml(settings.hero_subtitle)}</textarea></label>
            <label class="field"><span class="field-label">Hero Image URL</span><input class="input" name="hero_image_url" value="${escapeHtml(settings.hero_image_url)}" required /></label>
            <div class="hero-image preview"><img src="${escapeHtml(settings.hero_image_url)}" alt="Current homepage hero preview" /></div>
            <button class="button primary" type="submit">Save Site Settings</button>
            <p class="status" data-site-settings-status></p>
          </form>
        </div>
      </section>
    </main>
  `;
}

async function savePost(form, publishIntent) {
  const status = form.querySelector("[data-editor-status]");
  const formData = new FormData(form);
  const payload = {
    title: formData.get("title"),
    content: formData.get("content") || "",
    cover_image_url: formData.get("cover_image_url") || null,
    published: publishIntent || formData.get("published") === "on",
    tags: String(formData.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean),
  };
  try {
    status.textContent = "Saving...";
    const saved = state.selected?.id
      ? await request(`/posts/${state.selected.id}`, { method: "PUT", body: JSON.stringify(payload) })
      : await request("/posts", { method: "POST", body: JSON.stringify(payload) });
    state.selected = saved;
    await renderAdmin();
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
}

async function uploadImage(file) {
  const form = new FormData();
  form.append("file", file);
  const result = await request("/upload/image", { method: "POST", body: form });
  const cover = document.querySelector('[name="cover_image_url"]');
  if (cover) cover.value = result.url;
}

function navigate(path) {
  history.pushState({}, "", path);
  route();
}

async function route() {
  const path = window.location.pathname;
  try {
    if (path === "/admin") await renderAdmin();
    else if (path.startsWith("/post/")) await renderPost(decodeURIComponent(path.replace("/post/", "")));
    else {
      document.title = "Journal";
      await renderHome();
    }
  } catch (error) {
    app.innerHTML = shell(`<main class="empty-band center"><div class="narrow"><h1 class="section-title">Something needs attention.</h1><p class="dek">${escapeHtml(error.message)}</p><p style="margin-top:32px"><a class="button" href="/" data-link>Return Home</a></p></div></main>`);
  }
}

document.addEventListener("click", async (event) => {
  const aboutLink = event.target.closest("[data-scroll-about]");
  if (aboutLink) {
    event.preventDefault();
    if (window.location.pathname !== "/") {
      history.pushState({}, "", "/#about");
      await route();
    }
    document.querySelector("#about")?.scrollIntoView({ behavior: "smooth", block: "end" });
    return;
  }

  const topLink = event.target.closest("[data-scroll-top]");
  if (topLink) {
    event.preventDefault();
    if (window.location.pathname !== "/") {
      history.pushState({}, "", "/");
      await route();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const link = event.target.closest("[data-link]");
  if (link) {
    const href = link.getAttribute("href");
    if (href && href.startsWith("/")) {
      event.preventDefault();
      navigate(href);
    }
  }
  const openPost = event.target.closest("[data-open-post]");
  if (openPost) navigate(`/post/${openPost.dataset.openPost}`);
  const pageButton = event.target.closest("[data-page]");
  if (pageButton && !pageButton.disabled) {
    state.page = Number(pageButton.dataset.page);
    await renderHome();
  }
  const editPost = event.target.closest("[data-edit-post]");
  if (editPost) {
    state.adminView = "editor";
    state.selected = state.posts.find((post) => String(post.id) === editPost.dataset.editPost);
    renderAdminLayout();
  }
  if (event.target.closest("[data-new-post]")) {
    state.adminView = "editor";
    state.selected = blankPost();
    renderAdminLayout();
  }
  if (event.target.closest("[data-dashboard]")) {
    state.adminView = "editor";
    renderAdminLayout();
  }
  if (event.target.closest("[data-settings]")) {
    state.adminView = "settings";
    renderAdminLayout();
  }
  if (event.target.closest("[data-site-settings]")) {
    state.adminView = "site";
    await renderSiteSettingsLayout();
  }
  if (event.target.closest("[data-site]")) navigate("/");
  if (event.target.closest("[data-logout]")) {
    localStorage.removeItem(TOKEN_KEY);
    state.token = null;
    state.selected = null;
    renderLogin();
  }
  if (event.target.closest("[data-delete]") && state.selected?.id && confirm("Delete this post permanently?")) {
    await request(`/posts/${state.selected.id}`, { method: "DELETE" });
    state.selected = null;
    await renderAdmin();
  }
  if (event.target.closest("[data-insert-link]")) {
    const textarea = document.querySelector('[name="content"]');
    if (textarea) textarea.setRangeText("[Link text](https://example.com)", textarea.selectionStart, textarea.selectionEnd, "end");
  }
  if (event.target.closest("[data-insert-code]")) {
    const textarea = document.querySelector('[name="content"]');
    if (textarea) textarea.setRangeText("\n```\ncode\n```\n", textarea.selectionStart, textarea.selectionEnd, "end");
  }
});

document.addEventListener("submit", async (event) => {
  const login = event.target.closest("[data-login]");
  if (login) {
    event.preventDefault();
    const status = login.querySelector("[data-login-status]");
    const body = new URLSearchParams(new FormData(login));
    try {
      status.textContent = "Signing in...";
      const res = await fetch("/auth/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Unable to sign in");
      state.token = data.access_token;
      localStorage.setItem(TOKEN_KEY, state.token);
      await renderAdmin();
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
    }
  }

  const editor = event.target.closest("[data-editor]");
  if (editor) {
    event.preventDefault();
    await savePost(editor, Boolean(event.submitter?.matches("[data-publish]")));
  }

  const passwordForm = event.target.closest("[data-change-password]");
  if (passwordForm) {
    event.preventDefault();
    await changePassword(passwordForm);
  }

  const siteSettingsForm = event.target.closest("[data-site-settings-form]");
  if (siteSettingsForm) {
    event.preventDefault();
    await saveSiteSettings(siteSettingsForm);
  }
});

async function saveSiteSettings(form) {
  const status = form.querySelector("[data-site-settings-status]");
  const formData = new FormData(form);
  try {
    status.classList.remove("error");
    status.textContent = "Saving site settings...";
    state.siteSettings = await request("/settings/site", {
      method: "PUT",
      body: JSON.stringify({
        hero_title: formData.get("hero_title"),
        hero_subtitle: formData.get("hero_subtitle"),
        hero_image_url: formData.get("hero_image_url"),
      }),
    });
    status.textContent = "Saved.";
    await renderSiteSettingsLayout();
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
}

async function changePassword(form) {
  const status = form.querySelector("[data-password-status]");
  const formData = new FormData(form);
  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (newPassword !== confirmPassword) {
    status.textContent = "New password and confirmation do not match.";
    status.classList.add("error");
    return;
  }

  try {
    status.classList.remove("error");
    status.textContent = "Updating password...";
    await request("/auth/password", {
      method: "PUT",
      body: JSON.stringify({
        current_password: formData.get("current_password"),
        new_password: newPassword,
      }),
    });
    localStorage.removeItem(TOKEN_KEY);
    state.token = null;
    state.selected = null;
    state.adminView = "editor";
    renderLogin("Password changed. Sign in with the new password.");
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
}

document.addEventListener("change", async (event) => {
  const input = event.target.closest("[data-upload]");
  if (input?.files?.[0]) await uploadImage(input.files[0]);
});

window.addEventListener("popstate", route);
route();
