# LUXUR Content Operations

## Proyecto
Dashboard de contenidos y calendario para LUXUR Jeans. Genera HTMLs de calendario semanal con data live de Shopify, los sube a GitHub, y Netlify los despliega automáticamente.

## Stack
- HTML/CSS estático (calendarios semanales, dashboards)
- Datos de Shopify Admin API vía MCP
- GitHub para versionamiento y deploy trigger
- Netlify para hosting y deploy automático

## Marca LUXUR — Identidad Visual
- Color primario: `#edebe6` (cream)
- Color secundario: `#f2d4d7` (rosa claro)
- Color accent: `#e8a5ad` (rosa hot)
- Color deep: `#d4848e` (rosa profundo)
- Negro: `#1a1a1a`
- Tipografía display: Cormorant Garamond (serif, 700/900)
- Tipografía body: Outfit (sans-serif, 300-700)
- Tipografía mono: JetBrains Mono (datos, tags, badges)
- Google Fonts URL: `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap`

## Estructura de Archivos
```
luxur-content-ops/
├── CLAUDE.md                    # Este archivo
├── .claude/
│   └── settings.json            # MCP servers (Shopify, GitHub)
├── calendars/
│   ├── semana1-may12-18.html    # Calendario semana 1
│   ├── semana2-may19-25.html    # Calendario semana 2 + midcheck
│   └── ...                      # Semanas siguientes
├── dashboards/
│   ├── reunion-contenidos.html  # Dashboard de reunión
│   └── midcheck.html            # Midcheck semanal
├── templates/
│   └── calendar-base.html       # Template base con CSS variables
└── index.html                   # Landing con links a todos los calendarios
```

## Shopify — Tienda LUXUR
- Dominio: luxurunited.myshopify.com
- Moneda: COP (pesos colombianos)
- Formatos de precio: siempre en COP, sin decimales (ej: $219,000)
- MCP Server: Shopify Dev MCP para data de productos, órdenes, inventario
- Queries clave:
  - Ventas por día: `FROM sales SHOW gross_sales, net_sales, orders TIMESERIES day SINCE -7d UNTIL today`
  - Top productos: `FROM sales SHOW gross_sales, orders GROUP BY product_title ORDER BY gross_sales DESC LIMIT 15 SINCE -7d UNTIL today`
  - Productos activos: buscar con `status:active` ordenados por `UPDATED_AT`
  - Inventario: revisar `totalInventory` y `variants.inventoryQuantity` por talla

## Pipeline de Producción LUXUR (Mayo 2026)
### Entregados — Lanzados semana 1
- Jean Men Deserve Less Negro
- Jean Wide Leg Fit Washed Verde
- Jean Wide Leg Fit Dirty Azul

### Pre-órdenes abiertas (~15 días desde mayo 9)
- Jean Estrellas Rosadas (restock)
- Jean Estrellas Blancas (NUEVO — no abrir pre-orden)
- Jean Men Deserve Less Azul (tiene inventario negativo = demanda real)
- Jean LUXUR Riders (solo S:7 → agotar antes de restock)
- Jean Estrella Negra (agotado)

### Pipeline futuro
- Jean Bordado Costado (~20 días)
- Jean Piedras por Fuera Azul con Pretina (sin fecha)
- Jean LUXUR OAYAMA (sin fecha)
- Jean U Can Have Me sin Pretina (sin fecha)
- Low Waist con Correa Café + Azul (entrega mayo)

### Colección Destroyed (6 semanas — ~Jun 20)
- Negro, Azul, Azul Claro, Arena
- Tallas XS a XL
- Campaña de lanzamiento completa planeada

## Formato de Calendario Semanal
Cada calendario HTML incluye:
1. **Header** con brand, semana, y métricas clave
2. **Grilla semanal** (7 columnas Lun-Dom) con eventos color-coded
3. **Detalle día a día** con:
   - Tipo de contenido exacto (Post carrusel, Reel, Stories)
   - Número de slides/stories
   - Copy/concepto para cada pieza
   - Datos de inventario live de Shopify
   - Tags y acciones de Shopify
4. **Footer** con fecha de actualización

### Tipos de evento y colores:
- **Lanzamiento**: fondo negro `#1a1a1a`, texto cream
- **Pre-orden/Pauta**: fondo rosa `#f2d4d7`, texto negro
- **Push/Cross-sell**: fondo cream dark `#dedad3`, texto negro
- **Recap**: gradiente rosa-cream con borde
- **Admin**: borde dashed, sin fondo

### Estructura semanal preferida:
- LUN: Contenido fuerte (lanzamiento o push principal) — Post + Reel + Stories
- MAR: Contenido complementario (pre-orden, pauta) — Post + Stories
- MIÉ: Contenido fuerte — Post + Reel + Stories
- JUE: Contenido complementario — Post + Stories
- VIE: Contenido fuerte — Post + Reel + Stories
- SÁB: Cross-sell / stories ligeras — Stories
- DOM: Recap semanal — Post + Stories

## Convenciones
- Idioma: Español con copy de marca en Spanglish
- Siempre especificar el formato exacto: Post, Reel, Stories
- Incluir datos de inventario live (talla:cantidad) con color coding
- Tags de inventario: verde (ok, >5), amarillo (low, 1-5), rojo (out, ≤0)
- Moneda siempre en COP sin decimales
- Cada día DEBE tener contenido — no hay días vacíos
- Al generar, siempre jalar data fresca de Shopify primero
