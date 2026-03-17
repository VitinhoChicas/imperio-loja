// ========================================
// IMPERIO - Loja de Roupas
// Painel Administrativo (Supabase)
// ========================================

// Senha de acesso ao admin (altere para sua senha)
const ADMIN_PASSWORD = 'imperio2024';

// Mapeamento de categorias
const CATEGORY_LABELS = {
    'camisas-moletons': 'Camisas/Moletons',
    'calcados': 'Calçados',
    'shorts-calcas': 'Shorts/Calças'
};

// Estado da aplicação
let products = [];
let currentFilter = 'todos';
let editingProductId = null;
let confirmCallback = null;

// Elementos DOM - Login
const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Elementos DOM - Stats
const totalProductsEl = document.getElementById('totalProducts');
const availableProductsEl = document.getElementById('availableProducts');
const archivedProductsEl = document.getElementById('archivedProducts');

// Elementos DOM - Products
const adminProductsEl = document.getElementById('adminProducts');
const addProductBtn = document.getElementById('addProductBtn');
const filterBtns = document.querySelectorAll('.filter-btn');

// Elementos DOM - Form Modal
const productFormModal = document.getElementById('productFormModal');
const formModalClose = document.getElementById('formModalClose');
const productForm = document.getElementById('productForm');
const formTitle = document.getElementById('formTitle');
const productIdInput = document.getElementById('productId');
const productCategoryInput = document.getElementById('productCategory');
const productImageInput = document.getElementById('productImage');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const productNameInput = document.getElementById('productName');
const productPriceInput = document.getElementById('productPrice');
const cancelFormBtn = document.getElementById('cancelForm');

// Elementos DOM - Confirm Modal
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmCancel = document.getElementById('confirmCancel');
const confirmAction = document.getElementById('confirmAction');

// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// ========================================
// AUTENTICAÇÃO
// ========================================

function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('imperio_admin_logged');
    if (isLoggedIn === 'true') {
        showAdminPanel();
    }
}

function login(password) {
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('imperio_admin_logged', 'true');
        showAdminPanel();
        return true;
    }
    return false;
}

function logout() {
    sessionStorage.removeItem('imperio_admin_logged');
    loginScreen.style.display = 'flex';
    adminPanel.style.display = 'none';
}

function showAdminPanel() {
    loginScreen.style.display = 'none';
    adminPanel.style.display = 'block';
    loadProducts();
}

// ========================================
// SUPABASE - CARREGAR PRODUTOS
// ========================================

async function loadProducts() {
    if (typeof supabase === 'undefined') {
        adminProductsEl.innerHTML = `
            <div class="empty-state">
                <p>Configure o Supabase para gerenciar os produtos.</p>
                <p>Veja o tutorial de configuração.</p>
            </div>
        `;
        return;
    }

    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar produtos:', error);
            adminProductsEl.innerHTML = `
                <div class="empty-state">
                    <p>Erro ao carregar produtos.</p>
                    <p>${error.message}</p>
                </div>
            `;
            return;
        }

        products = data || [];
        updateStats();
        renderProducts();

    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        adminProductsEl.innerHTML = `
            <div class="empty-state">
                <p>Erro ao carregar produtos.</p>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// ========================================
// ESTATÍSTICAS
// ========================================

function updateStats() {
    const total = products.length;
    const available = products.filter(p => !p.archived).length;
    const archived = products.filter(p => p.archived).length;

    totalProductsEl.textContent = total;
    availableProductsEl.textContent = available;
    archivedProductsEl.textContent = archived;
}

// ========================================
// RENDERIZAR PRODUTOS
// ========================================

function renderProducts() {
    let filteredProducts = products;

    // Filtros de status
    if (currentFilter === 'disponivel') {
        filteredProducts = products.filter(p => !p.archived);
    } else if (currentFilter === 'arquivado') {
        filteredProducts = products.filter(p => p.archived);
    }
    // Filtros de categoria
    else if (currentFilter === 'camisas-moletons' || currentFilter === 'calcados' || currentFilter === 'shorts-calcas') {
        filteredProducts = products.filter(p => p.category === currentFilter);
    }

    if (filteredProducts.length === 0) {
        adminProductsEl.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <p>Nenhum produto encontrado</p>
            </div>
        `;
        return;
    }

    adminProductsEl.innerHTML = filteredProducts.map(product => `
        <div class="admin-product-card ${product.archived ? 'archived' : ''}" data-id="${product.id}">
            <img src="${product.image_url}" alt="${product.name}" class="admin-product-image">
            <div class="admin-product-info">
                <span class="admin-product-category">${CATEGORY_LABELS[product.category] || 'Sem categoria'}</span>
                <p class="admin-product-name">${product.name}</p>
                <p class="admin-product-price">${formatPrice(product.price)}</p>
                <p class="admin-product-sizes">Tamanhos: ${product.sizes ? product.sizes.join(', ') : 'N/A'}</p>
                <span class="admin-product-status ${product.archived ? 'archived' : ''}">
                    ${product.archived ? 'Arquivado' : 'Disponível'}
                </span>
            </div>
            <div class="admin-product-actions">
                <button class="btn-secondary btn-small" onclick="editProduct('${product.id}')">Editar</button>
                ${product.archived
                    ? `<button class="btn-primary btn-small" onclick="unarchiveProduct('${product.id}')">Restaurar</button>`
                    : `<button class="btn-secondary btn-small" onclick="archiveProduct('${product.id}')">Arquivar</button>`
                }
                <button class="btn-danger btn-small" onclick="deleteProduct('${product.id}')">Excluir</button>
            </div>
        </div>
    `).join('');
}

// ========================================
// FORMULÁRIO DE PRODUTO
// ========================================

function openProductForm(productId = null) {
    editingProductId = productId;

    if (productId) {
        // Editando produto existente
        const product = products.find(p => p.id == productId);
        if (!product) return;

        formTitle.textContent = 'Editar Roupa';
        productCategoryInput.value = product.category || '';
        productNameInput.value = product.name;
        productPriceInput.value = product.price;

        // Marcar tamanhos
        document.querySelectorAll('input[name="sizes"]').forEach(checkbox => {
            checkbox.checked = product.sizes && product.sizes.includes(checkbox.value);
        });

        // Mostrar imagem atual
        if (product.image_url) {
            previewImg.src = product.image_url;
            previewImg.style.display = 'block';
            imagePreview.style.display = 'none';
        }
    } else {
        // Novo produto
        formTitle.textContent = 'Nova Roupa';
        productForm.reset();
        previewImg.style.display = 'none';
        imagePreview.style.display = 'flex';
    }

    productFormModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProductForm() {
    productFormModal.classList.remove('active');
    document.body.style.overflow = '';
    editingProductId = null;
    productForm.reset();
    previewImg.style.display = 'none';
    imagePreview.style.display = 'flex';
}

async function saveProduct(e) {
    e.preventDefault();

    const category = productCategoryInput.value;
    const name = productNameInput.value.trim();
    const price = parseFloat(productPriceInput.value);
    const sizes = Array.from(document.querySelectorAll('input[name="sizes"]:checked')).map(cb => cb.value);
    const imageFile = productImageInput.files[0];

    if (!category) {
        alert('Selecione uma categoria');
        return;
    }

    if (!name || !price) {
        alert('Preencha todos os campos obrigatórios');
        return;
    }

    if (sizes.length === 0) {
        alert('Selecione pelo menos um tamanho');
        return;
    }

    if (!editingProductId && !imageFile) {
        alert('Selecione uma foto para a roupa');
        return;
    }

    const saveBtn = document.getElementById('saveProduct');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
        let image_url = null;

        // Upload da imagem se houver nova
        if (imageFile) {
            const fileName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('products')
                .upload(fileName, imageFile);

            if (uploadError) {
                throw new Error('Erro ao fazer upload da imagem: ' + uploadError.message);
            }

            // Obter URL pública
            const { data: urlData } = supabase.storage
                .from('products')
                .getPublicUrl(fileName);

            image_url = urlData.publicUrl;
        }

        if (editingProductId) {
            // Atualizar produto existente
            const updateData = {
                category,
                name,
                price,
                sizes
            };

            if (image_url) {
                updateData.image_url = image_url;
            }

            const { error } = await supabase
                .from('products')
                .update(updateData)
                .eq('id', editingProductId);

            if (error) throw error;

        } else {
            // Criar novo produto
            const { error } = await supabase
                .from('products')
                .insert({
                    category,
                    name,
                    price,
                    sizes,
                    image_url,
                    archived: false
                });

            if (error) throw error;
        }

        closeProductForm();
        loadProducts();

    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar produto: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar';
    }
}

// ========================================
// AÇÕES DOS PRODUTOS
// ========================================

function editProduct(productId) {
    openProductForm(productId);
}

function archiveProduct(productId) {
    showConfirm(
        'Arquivar Roupa',
        'A roupa não aparecerá mais na loja, mas você pode restaurá-la depois.',
        async () => {
            try {
                const { error } = await supabase
                    .from('products')
                    .update({ archived: true })
                    .eq('id', productId);

                if (error) throw error;
                loadProducts();

            } catch (error) {
                alert('Erro ao arquivar: ' + error.message);
            }
        }
    );
}

function unarchiveProduct(productId) {
    showConfirm(
        'Restaurar Roupa',
        'A roupa voltará a aparecer na loja.',
        async () => {
            try {
                const { error } = await supabase
                    .from('products')
                    .update({ archived: false })
                    .eq('id', productId);

                if (error) throw error;
                loadProducts();

            } catch (error) {
                alert('Erro ao restaurar: ' + error.message);
            }
        }
    );
}

function deleteProduct(productId) {
    showConfirm(
        'Excluir Roupa',
        'Esta ação não pode ser desfeita. A roupa será removida permanentemente.',
        async () => {
            try {
                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', productId);

                if (error) throw error;
                loadProducts();

            } catch (error) {
                alert('Erro ao excluir: ' + error.message);
            }
        }
    );
}

// ========================================
// MODAL DE CONFIRMAÇÃO
// ========================================

function showConfirm(title, message, callback) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmCallback = callback;
    confirmModal.classList.add('active');
}

function hideConfirm() {
    confirmModal.classList.remove('active');
    confirmCallback = null;
}

// ========================================
// FILTROS
// ========================================

function setFilter(filter) {
    currentFilter = filter;

    filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    renderProducts();
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    // Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const success = login(passwordInput.value);
        if (!success) {
            loginError.textContent = 'Senha incorreta';
            passwordInput.value = '';
        }
    });

    logoutBtn.addEventListener('click', logout);

    // Adicionar produto
    addProductBtn.addEventListener('click', () => openProductForm());

    // Form modal
    formModalClose.addEventListener('click', closeProductForm);
    cancelFormBtn.addEventListener('click', closeProductForm);
    productFormModal.addEventListener('click', (e) => {
        if (e.target === productFormModal) closeProductForm();
    });
    productForm.addEventListener('submit', saveProduct);

    // Preview da imagem
    productImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                imagePreview.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // Confirm modal
    confirmCancel.addEventListener('click', hideConfirm);
    confirmAction.addEventListener('click', async () => {
        if (confirmCallback) {
            await confirmCallback();
        }
        hideConfirm();
    });
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) hideConfirm();
    });

    // Filtros
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });

    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductForm();
            hideConfirm();
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
