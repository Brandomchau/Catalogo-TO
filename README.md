# Tecno Oriental — Catálogo estático para GitHub Pages

Catálogo de productos 100% estático, sin servidor ni base de datos.
Los clientes ven el catálogo, seleccionan productos y te envían su
selección por correo. No hay pagos en línea.

---

## Cómo actualizar el catálogo

Todo se hace desde el panel de administración (`/admin`), y el resultado
se publica subiendo un ZIP al repositorio.

### Opción A — Ya tienes las fotos en `img/productos/`

Si prefieres copiar todas tus fotos directamente a la carpeta
`img/productos/` del proyecto (con el nombre que tú quieras, sin pasar
por el panel), usa el **banco de imágenes** para no tener que subirlas
una por una ni que el sistema les cambie el nombre:

1. **Copia tus fotos** a `img/productos/` con el nombre que prefieras
   (ej. `caja-carton.jpg`).
2. **Abre el panel** — `/admin/index.html` — y ve a Productos o Categorías.
3. Dale clic a **"Sincronizar carpeta de imágenes"** y selecciona la
   carpeta `img/productos` de este mismo proyecto. Esto solo lee los
   *nombres* de los archivos, no las fotos en sí.
4. Al crear o editar un producto, en "Fotos" verás una cuadrícula con
   todas las fotos disponibles del banco de imágenes. Dale clic a la que
   quieras: se guarda con su nombre original, tal cual.
5. Una foto que ya está ligada a un producto **no vuelve a aparecer**
   como seleccionable en otros productos, así evitas repetirla por error.
6. Sigue con "Exportar catálogo" (paso 3 de abajo) para publicar.

> Nota: el navegador no puede "ver" la carpeta del repositorio por sí
> solo, por eso hay que sincronizarla manualmente cada vez que agregues
> fotos nuevas a `img/productos/`.

### Opción B — Subir fotos desde el panel (como antes)

1. **Abre el panel** — `/admin/index.html` (local o en el sitio publicado).
2. **Agrega o edita productos** — botón "Subir foto nueva"; las fotos se
   comprimen solas a 800px (~50-90KB cada una) y se les asigna un nombre
   único automáticamente.
3. **Exporta el catálogo** — botón "Exportar catálogo". Descarga un ZIP.
4. **Descomprime el ZIP** encima de la carpeta del proyecto. Reemplaza
   las carpetas `data/` e `img/`.
5. **Sube a GitHub** — `git add . && git commit -m "Actualizar catálogo" && git push`
6. Espera 1-2 minutos y revisa el sitio publicado.

Las dos opciones se pueden combinar sin problema: unas fotos vienen del
banco de imágenes y otras las subes directo desde el panel.

### Editar desde otra computadora

El panel guarda tu trabajo en el navegador donde lo estás usando, así que
para continuar en otra máquina:

- **Exporta** el catálogo antes de moverte y guarda el ZIP.
- En la otra computadora, abre el panel y usa **"Importar"** con ese ZIP.
- Sigue editando donde te quedaste y vuelve a exportar al terminar.
- El banco de imágenes (los nombres de archivo sincronizados) también
  viaja dentro del ZIP, así que no hace falta volver a sincronizar la
  carpeta en la otra computadora — solo asegúrate de que las fotos
  físicas también estén ahí (mismo `img/productos/`) para que las
  miniaturas se vean bien.

El botón de **Restablecer** (la flecha circular) descarta los cambios de
ese navegador y vuelve a lo que ya está publicado en el sitio.

---

## Estructura

```
├── index.html            ← Página principal
├── productos.html        ← Catálogo con filtros
├── carrito.html          ← Productos seleccionados
├── checkout.html         ← Envío de la selección por correo
├── pedido-exitoso.html   ← Confirmación / recibo imprimible
├── admin/index.html      ← Panel de administración
├── pages/producto.html   ← Detalle de producto
├── css/main.css          ← Estilos (solo modo oscuro)
├── js/
│   ├── store.js          ← Datos, selección, manejo de fotos
│   └── layout.js         ← Menú y pie de página compartidos
├── data/
│   ├── products.json         ← Productos (solo texto y rutas de fotos)
│   ├── categories.json       ← Categorías
│   └── images-manifest.json  ← Nombres de archivo del banco de imágenes (opcional)
└── img/productos/        ← Fotos de productos y categorías
```

**Importante:** las fotos son archivos reales dentro de `img/productos/`.
Los JSON solo guardan la ruta (`"img/productos/foto.jpg"`), no la imagen.
Por eso el catálogo carga rápido aunque haya cientos de productos.

---

## Estructura de un producto

```json
{
  "id": 9,
  "name": "Nombre del producto",
  "description": "<p>Descripción</p>",
  "price": 5499.00,
  "wholesale_price": 4999.00,
  "note": "Comentario opcional",
  "category_id": 1,
  "featured": true,
  "available": true,
  "images": ["img/productos/foto.jpg"],
  "variants": [
    { "id": 1, "name": "Tamaño", "value": "19 pulgadas", "price": 5499.00 }
  ]
}
```

- `wholesale_price` y `note` son opcionales: si los dejas vacíos, no
  aparecen en la página del producto.
- `available` controla el sello de "Disponible / No disponible".
- Las `variants` (tamaños, modelos) cambian el precio mostrado, pero
  siempre se usa la misma foto.

---

## Configuración

### Nombre de la tienda
Está en `js/layout.js` (menú, pie de página y derechos reservados) y en
la etiqueta `<title>` de cada archivo HTML.

### Correo donde llegan los pedidos
En `checkout.html`, la constante `DESTINATION_EMAIL`.

Los pedidos se envían con **EmailJS** (plan gratuito: 200 correos/mes).
Hay que configurar tres claves en `checkout.html`:

```js
const EMAILJS_PUBLIC_KEY  = '...';
const EMAILJS_SERVICE_ID  = '...';
const EMAILJS_TEMPLATE_ID = '...';
```

En la plantilla de EmailJS usa `{{{items_html}}}` con **triple llave**
para que la lista de productos salga con formato.

### Contraseña del panel
En `admin/index.html`:

```js
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';
```

Cámbiala. Ojo: al ser un sitio estático, cualquiera puede ver esta clave
en el código fuente. Sirve contra curiosos, no es seguridad real.

---

## Límites de GitHub Pages

| Recurso | Límite |
|---------|--------|
| Tamaño del repositorio | 1 GB recomendado |
| Sitio publicado | 1 GB máximo |
| Ancho de banda | 100 GB/mes (límite blando) |

Con fotos comprimidas a ~70KB, 400 productos ocupan unos 30 MB — muy
holgado dentro del límite.
