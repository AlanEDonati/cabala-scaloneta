// Al cargar la página, traemos los productos
document.addEventListener("DOMContentLoaded", () => {
    cargarStore();
});

async function cargarStore() {
    const res = await fetch("/products");
    const productos = await res.json();
    const contenedor = document.querySelector(".store-grid");

    if (!contenedor) return;

    contenedor.innerHTML = productos.map(p => `
        <div class="product-card">
            <div class="badge">${p.category.toUpperCase()}</div>
            <img src="${p.image_url}" alt="${p.name}" class="product-img">
            <h3>${p.name}</h3>
            <p class="price">$${Number(p.price).toLocaleString('es-AR')}</p>
            <button class="btn-buy" onclick="comprar(${p.id})">¡La quiero!</button>
        </div>
    `).join('');
}

function comprar(id) {
    alert("¡Buena elección! Producto añadido al carrito de la Scaloneta.");
}