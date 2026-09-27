// Shared nav/footer HTML injector
// Call: injectNav('active-link-id'), injectFooter()

function injectNav(activeId) {
  const isRoot = !window.location.pathname.includes('/pages/');
  const base = isRoot ? '' : '../';

  const html = `
  <nav class="navbar-custom">
    <div class="navbar-inner">
      <a class="navbar-brand" href="${base}index.html">
        Tecno Oriental
      </a>
      <ul class="nav-links">
        <li><a href="${base}index.html" ${activeId === 'home' ? 'class="active"' : ''}>Inicio</a></li>
        <li><a href="${base}productos.html" ${activeId === 'products' ? 'class="active"' : ''}>Productos</a></li>
        <li class="nav-dropdown">
          <a href="#" ${activeId === 'categories' ? 'class="active"' : ''}>Categorías ▾</a>
          <ul class="dropdown-menu-custom" id="categories-dropdown"></ul>
        </li>
        <li><a href="${base}index.html#contacto" ${activeId === 'contact' ? 'class="active"' : ''}>Contacto</a></li>
      </ul>
      <div class="navbar-actions">
        <a href="${base}carrito.html" class="cart-btn" title="Productos seleccionados">
          <i class="fas fa-list-check"></i>
          <span class="cart-badge">0</span>
        </a>
        <a href="${base}admin/index.html" class="btn btn-primary btn-sm" style="display:flex;align-items:center;gap:.4rem;padding:.5rem 1.1rem;font-size:.82rem;border-radius:50px;background:var(--gradient);color:white;border:none;cursor:pointer;">
          <i class="fas fa-lock"></i> Admin
        </a>
      </div>
      <button class="hamburger" id="hamburger" aria-label="Menu">
        <i class="fas fa-bars"></i>
      </button>
    </div>
  </nav>
  <div class="mobile-nav" id="mobileNav">
    <a href="${base}index.html">Inicio</a>
    <a href="${base}productos.html">Productos</a>
    <a href="${base}carrito.html">📋 Seleccionados</a>
    <a href="${base}admin/index.html">⚙️ Admin</a>
  </div>`;

  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.insertBefore(el, document.body.firstChild);

  // Hamburger toggle
  setTimeout(() => {
    document.getElementById('hamburger')?.addEventListener('click', () => {
      document.getElementById('mobileNav')?.classList.toggle('open');
    });
  }, 100);
}

function injectFooter() {
  const isRoot = !window.location.pathname.includes('/pages/');
  const base = isRoot ? '' : '../';

  const html = `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="footer-brand">Tecno Oriental</div>
        </div>
        <div>
          <h4 class="footer-heading">Navegación</h4>
          <ul class="footer-links">
            <li><a href="${base}index.html">Inicio</a></li>
            <li><a href="${base}productos.html">Catálogo</a></li>
            <li><a href="${base}carrito.html">Seleccionados</a></li>
            <li><a href="${base}index.html#contacto">Contacto</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} Tecno Oriental. Todos los derechos reservados.</p>
      </div>
    </div>
  </footer>`;

  document.body.insertAdjacentHTML('beforeend', html);
}
