// ========================================
// IMPERIO - Loja de Roupas
// Lógica da Loja (Supabase)
// ========================================

// Número do WhatsApp para pedidos
const WHATSAPP_NUMBER = '5517997539595';

// Mapeamento de categorias
const CATEGORY_LABELS = {
    'camisas-moletons': 'Camisas/Moletons',
    'calcados': 'Calçados',
    'shorts-calcas': 'Shorts/Calças'
};

// Estado da aplicação
let products = [];
let cart = JSON.parse(localStorage.getItem('imperio_cart')) || [];
let currentProduct = null;
let currentCategory = 'todos';
let currentPage = 'loja';

// Elementos DOM
const productsGrid = document.getElementById('productsGrid');
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const productModal = document.getElementById('productModal');
const modalClose = document.getElementById('modalClose');
const modalImage = document.getElementById('modalImage');
const modalThumbnails = document.getElementById('modalThumbnails');
const modalTitle = document.getElementById('modalTitle');
const modalCode = document.getElementById('modalCode');
const modalPrice = document.getElementById('modalPrice');
const modalSizes = document.getElementById('modalSizes');
const modalCategory = document.getElementById('modalCategory');
const sizeSelect = document.getElementById('sizeSelect');
const addToCartBtn = document.getElementById('addToCartBtn');
const buyNowBtn = document.getElementById('buyNowBtn');
const categoryBtns = document.querySelectorAll('.category-btn');
const navBtns = document.querySelectorAll('.nav-btn');
const pageLoja = document.getElementById('pageLoja');
const pageCreditos = document.getElementById('pageCreditos');

// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartUI();
    setupEventListeners();
});

// ========================================
// NAVEGAÇÃO
// ========================================

function switchPage(page) {
    currentPage = page;

    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    if (page === 'loja') {
        pageLoja.style.display = 'block';
        pageCreditos.style.display = 'none';
    } else if (page === 'creditos') {
        pageLoja.style.display = 'none';
        pageCreditos.style.display = 'block';
    }
}

// ========================================
// SUPABASE - CARREGAR PRODUTOS
// ========================================

async function loadProducts() {
    // Verificar se Supabase está configurado
    if (typeof supabase === 'undefined') {
        showEmptyState('Configure o Supabase para ver os produtos');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('archived', false)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar produtos:', error);
            showEmptyState('Erro ao carregar produtos');
            return;
        }

        products = data || [];
        renderProducts();

        // Configurar realtime para atualizações
        setupRealtimeSubscription();

    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showEmptyState('Erro ao carregar produtos');
    }
}

function setupRealtimeSubscription() {
    supabase
        .channel('products-channel')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            () => {
                loadProducts();
            }
        )
        .subscribe();
}

// ========================================
// RENDERIZAR PRODUTOS
// ========================================

function renderProducts() {
    if (products.length === 0) {
        showEmptyState('Nenhum produto disponível no momento');
        return;
    }

    let filteredProducts = products;

    // Filtrar por categoria
    if (currentCategory !== 'todos') {
        filteredProducts = products.filter(p => p.category === currentCategory);
    }

    if (filteredProducts.length === 0) {
        showEmptyState('Nenhum produto encontrado nesta categoria');
        return;
    }

    productsGrid.innerHTML = filteredProducts.map(product => {
        // Usar primeira imagem do array ou image_url
        const mainImage = (product.images && product.images.length > 0)
            ? product.images[0]
            : product.image_url;

        return `
        <div class="product-card" data-id="${product.id}">
            <img src="${mainImage}" alt="${product.name}" class="product-image" loading="lazy">
            <div class="product-info">
                <p class="product-category">${CATEGORY_LABELS[product.category] || ''}</p>
                <p class="product-code">Cód: ${product.code || 'N/A'}</p>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">${formatPrice(product.price)}</p>
                <p class="product-sizes">Tam: ${product.sizes ? product.sizes.join(', ') : 'N/A'}</p>
                <div class="product-actions">
                    <button class="btn-ver-produto" data-id="${product.id}">Ver</button>
                    <button class="btn-add-carrinho" data-id="${product.id}">+ Carrinho</button>
                    <button class="btn-comprar" data-id="${product.id}">Comprar</button>
                </div>
            </div>
        </div>
    `}).join('');

    // Adicionar event listeners aos botões
    document.querySelectorAll('.btn-ver-produto').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = btn.dataset.id;
            openProductModal(productId);
        });
    });

    document.querySelectorAll('.btn-add-carrinho').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = btn.dataset.id;
            addToCartQuick(productId);
        });
    });

    document.querySelectorAll('.btn-comprar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = btn.dataset.id;
            comprarDireto(productId);
        });
    });

    // Clicar na imagem também abre o modal
    document.querySelectorAll('.product-card .product-image').forEach(img => {
        img.addEventListener('click', () => {
            const productId = img.closest('.product-card').dataset.id;
            openProductModal(productId);
        });
    });
}

function showEmptyState(message) {
    productsGrid.innerHTML = `
        <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>${message}</p>
        </div>
    `;
}

// ========================================
// MODAL DO PRODUTO
// ========================================

function openProductModal(productId) {
    currentProduct = products.find(p => p.id == productId);
    if (!currentProduct) return;

    // Obter todas as imagens do produto
    let productImages = [];
    if (currentProduct.images && currentProduct.images.length > 0) {
        productImages = currentProduct.images;
    } else if (currentProduct.image_url) {
        productImages = [currentProduct.image_url];
    }

    // Mostrar primeira imagem
    modalImage.src = productImages[0] || '';
    modalImage.alt = currentProduct.name;

    // Criar thumbnails se houver mais de uma imagem
    if (productImages.length > 1) {
        modalThumbnails.innerHTML = productImages.map((img, index) =>
            `<img src="${img}" alt="Foto ${index + 1}" class="${index === 0 ? 'active' : ''}" data-index="${index}">`
        ).join('');
        modalThumbnails.style.display = 'flex';

        // Event listeners para thumbnails
        modalThumbnails.querySelectorAll('img').forEach(thumb => {
            thumb.addEventListener('click', () => {
                modalImage.src = thumb.src;
                modalThumbnails.querySelectorAll('img').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
        });
    } else {
        modalThumbnails.innerHTML = '';
        modalThumbnails.style.display = 'none';
    }

    modalTitle.textContent = currentProduct.name;
    modalCode.textContent = `Código: ${currentProduct.code || 'N/A'}`;
    modalPrice.textContent = formatPrice(currentProduct.price);
    modalCategory.textContent = CATEGORY_LABELS[currentProduct.category] || '';

    // Tamanhos disponíveis
    modalSizes.innerHTML = currentProduct.sizes
        ? currentProduct.sizes.map(size => `<span class="size-tag">${size}</span>`).join('')
        : '<span class="size-tag">N/A</span>';

    // Select de tamanhos
    sizeSelect.innerHTML = currentProduct.sizes
        ? currentProduct.sizes.map(size => `<option value="${size}">${size}</option>`).join('')
        : '<option value="">Sem tamanho</option>';

    productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    productModal.classList.remove('active');
    document.body.style.overflow = '';
    currentProduct = null;
}

// ========================================
// CARRINHO
// ========================================

function addToCart() {
    if (!currentProduct) return;

    const size = sizeSelect.value;

    // Verificar se já existe no carrinho
    const existingItem = cart.find(
        item => item.id === currentProduct.id && item.size === size
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: currentProduct.id,
            code: currentProduct.code,
            name: currentProduct.name,
            price: currentProduct.price,
            image_url: currentProduct.image_url,
            size: size,
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();
    closeProductModal();
    openCart();
}

// Adicionar ao carrinho rápido (do card do produto)
function addToCartQuick(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    // Usar o primeiro tamanho disponível
    const size = product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'Único';

    // Obter imagem principal
    const mainImage = (product.images && product.images.length > 0)
        ? product.images[0]
        : product.image_url;

    // Verificar se já existe no carrinho
    const existingItem = cart.find(
        item => item.id === product.id && item.size === size
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            code: product.code,
            name: product.name,
            price: product.price,
            image_url: mainImage,
            size: size,
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();

    // Mostrar feedback
    alert(`${product.name} (Tam: ${size}) adicionado ao carrinho!`);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('imperio_cart', JSON.stringify(cart));
}

function updateCartUI() {
    // Atualizar contador
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    // Atualizar lista de itens
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <p>Seu carrinho está vazio</p>
            </div>
        `;
        checkoutBtn.disabled = true;
    } else {
        cartItems.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <img src="${item.image_url}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-info">
                    <p class="cart-item-name">${item.name}</p>
                    <p class="cart-item-size">Tamanho: ${item.size}</p>
                    <p class="cart-item-price">${formatPrice(item.price)} x ${item.quantity}</p>
                    <button class="cart-item-remove" data-index="${index}">Remover</button>
                </div>
            </div>
        `).join('');

        // Event listeners para remover
        document.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                removeFromCart(parseInt(btn.dataset.index));
            });
        });

        checkoutBtn.disabled = false;
    }

    // Atualizar total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = formatPrice(total);
}

function openCart() {
    cartSidebar.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ========================================
// COMPRAR DIRETO - WHATSAPP
// ========================================

function comprarDireto(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const tamanhos = product.sizes ? product.sizes.join(', ') : 'N/A';

    let message = `Olá! Tenho interesse neste produto:\n\n`;
    message += `*Código:* ${product.code || 'N/A'}\n`;
    message += `*Produto:* ${product.name}\n`;
    message += `*Preço:* ${formatPrice(product.price)}\n`;
    message += `*Tamanhos disponíveis:* ${tamanhos}\n\n`;
    message += `Gostaria de mais informações!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
}

// Comprar agora do modal (com tamanho selecionado)
function buyNow() {
    if (!currentProduct) return;

    const size = sizeSelect.value;

    let message = `Olá! Quero comprar este produto:\n\n`;
    message += `*Código:* ${currentProduct.code || 'N/A'}\n`;
    message += `*Produto:* ${currentProduct.name}\n`;
    message += `*Tamanho:* ${size}\n`;
    message += `*Preço:* ${formatPrice(currentProduct.price)}\n\n`;
    message += `Aguardo confirmação! 😊`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    closeProductModal();
}

// ========================================
// CHECKOUT - WHATSAPP
// ========================================

function checkout() {
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let message = `Olá! Gostaria de fazer um pedido:\n\n`;

    cart.forEach((item, index) => {
        message += `*${index + 1}. ${item.name}*\n`;
        message += `   Código: ${item.code || 'N/A'}\n`;
        message += `   Tamanho: ${item.size}\n`;
        message += `   Quantidade: ${item.quantity}\n`;
        message += `   Valor: ${formatPrice(item.price * item.quantity)}\n\n`;
    });

    message += `*TOTAL: ${formatPrice(total)}*\n\n`;
    message += `Aguardo confirmação! 😊`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');

    // Limpar carrinho após enviar
    cart = [];
    saveCart();
    updateCartUI();
    closeCart();
}

// ========================================
// FILTROS DE CATEGORIA
// ========================================

function setCategory(category) {
    currentCategory = category;

    categoryBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });

    renderProducts();
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    // Navegação
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => switchPage(btn.dataset.page));
    });

    // Carrinho
    cartBtn.addEventListener('click', openCart);
    cartClose.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);
    checkoutBtn.addEventListener('click', checkout);

    // Modal do produto
    modalClose.addEventListener('click', closeProductModal);
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) closeProductModal();
    });
    addToCartBtn.addEventListener('click', addToCart);
    buyNowBtn.addEventListener('click', buyNow);

    // Categorias
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => setCategory(btn.dataset.category));
    });

    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
            closeCart();
        }
    });
}

// ========================================
// UTILIDADES
// ========================================

function formatPrice(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}
