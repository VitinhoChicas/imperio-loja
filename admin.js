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
const productImagesInput = document.getElementById('productImages');
const imagesPreview = document.getElementById('imagesPreview');
const productCodeInput = document.getElementById('productCode');
const productNameInput = document.getElementById('productName');
const productPriceInput = document.getElementById('productPrice');
const cancelFormBtn = document.getElementById('cancelForm');

// Array para armazenar as imagens selecionadas
let selectedImages = [];
let existingImages = [];

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
                <p class="admin-product-code"><strong>Código:</strong> ${product.code || 'N/A'}</p>
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
    selectedImages = [];
    existingImages = [];

    if (productId) {
        // Editando produto existente
        const product = products.find(p => p.id == productId);
        if (!product) return;

        formTitle.textContent = 'Editar Roupa';
        productCategoryInput.value = product.category || '';
        productCodeInput.value = product.code || '';
        productNameInput.value = product.name;
        productPriceInput.value = product.price;

        // Marcar tamanhos
        document.querySelectorAll('input[name="sizes"]').forEach(checkbox => {
            checkbox.checked = product.sizes && product.sizes.includes(checkbox.value);
        });

        // Carregar imagens existentes
        if (product.images && product.images.length > 0) {
            existingImages = [...product.images];
        } else if (product.image_url) {
            existingImages = [product.image_url];
        }
        updateImageSlots();
    } else {
        // Novo produto
        formTitle.textContent = 'Nova Roupa';
        productForm.reset();
        updateImageSlots();
    }

    productFormModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function updateImageSlots() {
    const slots = document.querySelectorAll('.image-slot');
    const allImages = [...existingImages];

    // Adicionar previews das novas imagens selecionadas
    selectedImages.forEach((file, index) => {
        if (allImages.length < 4) {
            allImages.push(URL.createObjectURL(file));
        }
    });

    slots.forEach((slot, index) => {
        if (index < allImages.length) {
            slot.innerHTML = `
                <img src="${allImages[index]}" alt="Foto ${index + 1}">
                <button type="button" class="remove-image" data-index="${index}">&times;</button>
            `;
            slot.classList.add('has-image');
        } else {
            slot.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            `;
            slot.classList.remove('has-image');
        }
    });

    // Adicionar event listeners para remover imagens
    document.querySelectorAll('.remove-image').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            removeImage(index);
        });
    });
}

function removeImage(index) {
    if (index < existingImages.length) {
        existingImages.splice(index, 1);
    } else {
        const selectedIndex = index - existingImages.length;
        selectedImages.splice(selectedIndex, 1);
    }
    updateImageSlots();
}

function closeProductForm() {
    productFormModal.classList.remove('active');
    document.body.style.overflow = '';
    editingProductId = null;
    selectedImages = [];
    existingImages = [];
    productForm.reset();
    updateImageSlots();
}

async function saveProduct(e) {
    e.preventDefault();

    const category = productCategoryInput.value;
    const code = productCodeInput.value.trim().toUpperCase();
    const name = productNameInput.value.trim();
    const price = parseFloat(productPriceInput.value);
    const sizes = Array.from(document.querySelectorAll('input[name="sizes"]:checked')).map(cb => cb.value);

    if (!category) {
        alert('Selecione uma categoria');
        return;
    }

    if (!code) {
        alert('Digite o código do produto');
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

    // Verificar se tem pelo menos uma imagem
    if (!editingProductId && selectedImages.length === 0) {
        alert('Selecione pelo menos uma foto para o produto');
        return;
    }

    if (editingProductId && existingImages.length === 0 && selectedImages.length === 0) {
        alert('O produto precisa ter pelo menos uma foto');
        return;
    }

    const saveBtn = document.getElementById('saveProduct');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Verificando código...';

    // Verificar se o código já existe
    const { data: existingProductData, error: checkError } = await supabase
        .from('products')
        .select('id, code')
        .eq('code', code)
        .maybeSingle();

    if (checkError) {
        alert('Erro ao verificar código: ' + checkError.message);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar';
        return;
    }

    // Se encontrou produto com mesmo código e não é o mesmo que estamos editando
    if (existingProductData && existingProductData.id !== editingProductId) {
        alert('Este código já está em uso por outro produto!');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar';
        return;
    }

    saveBtn.textContent = 'Enviando fotos...';

    try {
        // Upload das novas imagens
        let uploadedUrls = [...existingImages];

        for (let i = 0; i < selectedImages.length; i++) {
            if (uploadedUrls.length >= 4) break;

            const file = selectedImages[i];
            const fileName = `${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('products')
                .upload(fileName, file);

            if (uploadError) {
                throw new Error('Erro ao fazer upload da imagem: ' + uploadError.message);
            }

            // Obter URL pública
            const { data: urlData } = supabase.storage
                .from('products')
                .getPublicUrl(fileName);

            uploadedUrls.push(urlData.publicUrl);
        }

        saveBtn.textContent = 'Salvando...';

        // image_url mantém compatibilidade (primeira imagem)
        const image_url = uploadedUrls[0] || null;
        const images = uploadedUrls;

        if (editingProductId) {
            // Atualizar produto existente
            const { error } = await supabase
                .from('products')
                .update({
                    category,
                    code,
                    name,
                    price,
                    sizes,
                    image_url,
                    images
                })
                .eq('id', editingProductId);

            if (error) throw error;

        } else {
            // Criar novo produto
            const { error } = await supabase
                .from('products')
                .insert({
                    category,
                    code,
                    name,
                    price,
                    sizes,
                    image_url,
                    images,
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

    // Preview das imagens (múltiplas)
    productImagesInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        const totalImages = existingImages.length + selectedImages.length + files.length;

        if (totalImages > 4) {
            alert('Você pode adicionar no máximo 4 fotos');
            const allowedCount = 4 - existingImages.length - selectedImages.length;
            selectedImages.push(...files.slice(0, allowedCount));
        } else {
            selectedImages.push(...files);
        }

        updateImageSlots();
        productImagesInput.value = ''; // Limpar input para permitir selecionar mesmos arquivos
    });

    // Clicar nos slots para adicionar imagem
    imagesPreview.addEventListener('click', (e) => {
        const slot = e.target.closest('.image-slot');
        if (slot && !slot.classList.contains('has-image')) {
            productImagesInput.click();
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
