# LUXUR · Design System

Sistema de diseño de la app de operaciones de LUXUR United (producción, marketing y analytics).
Este documento es la fuente de verdad: pégalo en Claude Design para que cualquier pantalla nueva
salga idéntica a la app que ya existe.

---

## 0 · Contexto antes que estética

Tres cosas definen cada decisión de este sistema. Si una propuesta las contradice, está mal
aunque se vea bonita.

**Se usa en el celular, de pie, en una bodega.** Móvil primero siempre. Los targets se tocan con
el pulgar (mínimo 44px de alto). El desktop es la versión ampliada del móvil, no al revés.

**Quien lo usa es operativa, no analista.** Va a marcar etapas, aprobar contenido y revisar
cuánto falta. No va a interpretar tableros densos. Una pantalla que obliga a estudiar fracasó.

**La marca es un jean, no un software.** El sistema se siente boutique: crema, rosa, serif en las
cifras. Nunca azul corporativo, nunca gris SaaS.

---

## 1 · Color

### Tokens

| Token | Hex | Qué es |
|---|---|---|
| `--cream` | `#edebe6` | Fondo de toda la app. Nunca blanco puro de fondo. |
| `--cream-dark` | `#dedad3` | Fondo secundario: chips inactivos, separadores gruesos, borde superior neutro de tarjeta. |
| `--rosa` | `#f2d4d7` | Acento suave: fondo de chip activo, encabezado de tabla, píldora de sección. |
| `--rosa-hot` | `#e8a5ad` | Acento medio. Estados hover y elementos que piden atención sin ser alerta. |
| `--rosa-deep` | `#d4848e` | Acento fuerte. Etiquetas de campo, foco, botón principal, valor destacado. |
| `--black` | `#1a1a1a` | Texto principal y fondos invertidos (fila de total, botón sólido). |
| `--grey` | `#7a7570` | Texto secundario. Es un gris cálido, sesgado a la crema — no uses `#888`. |
| `--surface` | `#ffffff` | Superficie de tarjeta. El blanco solo aparece elevado sobre la crema. |

### Semánticos — reservados, no decorativos

| Token | Hex | Significado único |
|---|---|---|
| `--green-ok` | `#5a7a4f` | A tiempo · inventario sano (más de 5 unidades) |
| `--yellow-low` | `#c4a04a` | En riesgo · inventario bajo (1 a 5) |
| `--red-out` | `#b8504a` | Atrasado · agotado (0 o negativo) |

Estos tres nunca se usan por gusto estético. Si algo es verde, es porque está bien; si es rojo,
alguien tiene que hacer algo hoy.

### Reglas de color

- El rosa es acento, no fondo de contenido. Nunca pongas un párrafo sobre `--rosa`.
- El negro sólido se reserva para lo definitivo: el total de una tabla, el botón que ejecuta.
- Máximo un elemento rosa profundo por bloque. Si todo grita, nada grita.
- Nunca degradados. Se probaron y se quitaron: ensucian la crema.

---

## 2 · Tipografía

Cuatro familias, cada una con un trabajo exclusivo. Ninguna hace el trabajo de otra.

```
Montserrat        600            → SOLO el logotipo LUXUR
Cormorant Garamond 700 / 900     → cifras grandes y títulos editoriales
Outfit            300–600        → toda la interfaz y el texto corrido
JetBrains Mono    400–500        → etiquetas, datos, tallas, códigos
```

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;0,900;1,400&family=Montserrat:wght@500;600;700&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
```

**El logo es Montserrat SemiBold. Siempre. Nunca Cormorant, nunca otra.** Es la única regla del
sistema que no admite excepción.

### Escala

| Rol | Familia | Tamaño / peso | Uso |
|---|---|---|---|
| Logo | Montserrat 600 | 38px · interletraje normal | Marca en el encabezado |
| Cifra | Cormorant 700 | 42px móvil 32px · `line-height:.95` | El número de un indicador |
| Título de sección | Outfit 700 | 20px · `-.02em` | "Tus tareas de hoy" |
| Título de tarjeta | Outfit 600 | 15–16px | Nombre de referencia o lote |
| Cuerpo | Outfit 300–400 | 14px · `line-height:1.5` | Texto corrido |
| Meta | Outfit 500 | 12–13px · `--grey` | Fecha, proveedor, cantidad |
| Etiqueta | JetBrains Mono 500 | 9–11px · `.16em` · MAYÚSCULAS | "EN PRODUCCIÓN", "STOCK ACTUAL" |
| Dato | JetBrains Mono 400 | 10–12px | `S:7 · M:12`, `$219.000`, `OXAP-4421` |

La etiqueta en mono con interletraje ancho es la firma tipográfica del sistema: es lo que hace
que un indicador se lea como ficha técnica de taller y no como widget.

---

## 3 · Forma

**Radios** — `10px` controles pequeños · `12px` miniatura de foto · `16px` tarjeta ·
`18px` tarjeta grande · `999px` todo lo que sea chip, píldora o barra de navegación.

**Sombras** — dos niveles y nada más:
```css
/* reposo  */ box-shadow: 0 1px 3px rgba(0,0,0,.05);
/* elevado */ box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 6px 18px rgba(0,0,0,.05);
/* foco    */ box-shadow: 0 0 0 3px rgba(212,132,142,.35);
```

**Espaciado** — escala de 4: `4 · 8 · 12 · 14 · 18 · 24 · 32`. Separación entre tarjetas 14px,
padding interno 16–20px, respiro entre secciones 24px.

**Bordes** — casi no hay. La separación la hace el color de fondo (blanco sobre crema), no una
línea. Cuando se necesita: `1px solid rgba(0,0,0,.045)`.

---

## 4 · Componentes

### Tarjeta
Blanco sobre crema, radio 16–18px, sombra de reposo, franja superior de 3px que codifica estado
(`--cream-dark` neutro, `--rosa-deep` activo, `--red-out` atrasado). La franja es el único lugar
donde el estado se codifica solo con color, y siempre va acompañada de texto dentro.

### Indicador (KPI)
Tarjeta blanca con: etiqueta mono en mayúsculas arriba, cifra en Cormorant grande, y una línea de
apoyo en mono pequeño abajo. Cuatro por fila en desktop, dos en móvil. La cifra manda; el resto
susurra.

### Chip
Píldora de 999px. Inactivo: fondo blanco, borde `rgba(0,0,0,.08)`, texto `#555`.
Activo: fondo `--rosa`, texto negro, sin borde. Alto mínimo 36px.

### Fila de lista
Fondo blanco, 14–16px de padding, ícono o foto a la izquierda, título y meta apiladas al centro,
chevron a la derecha. Se agrupan en un contenedor con radio 16px y `overflow:hidden`, separadas
por 1px de crema. Toda la fila es tocable.

### Estado de inventario
Texto mono `S:7` con el color semántico. Nunca un punto de color solo: siempre dato + color.

### Barra de progreso
7px de alto, radio 4px, pista `rgba(0,0,0,.08)`, relleno `--rosa-deep`. Siempre acompañada de
texto que diga en palabras dónde va ("Va en: Lavandería · etapa 4 de 6").

### Botón principal
Negro sólido, texto crema, radio 999px o 14px, alto mínimo 48px, ancho completo en móvil.
Una sola acción principal visible por pantalla.

### Barra de pestañas
Fija abajo, flotante con margen lateral de 16px, radio 999px, fondo blanco translúcido con blur.
Ícono arriba, palabra abajo. La activa lleva el ícono sobre una píldora rosa.

### Panel de detalle
Hoja que sube desde abajo en móvil, centrada en desktop. Fondo crema, radio 24px arriba.
El detalle vive aquí — no aplastado dentro de la tarjeta.

---

## 5 · Reglas de la casa

Estas nacieron de errores reales. Romperlas es repetirlos.

**Un badge por elemento.** Si una referencia tiene tres cosas que decir, se dice la más urgente.
Las otras dos viven en el detalle.

**El detalle es bajo demanda.** La pantalla inicial responde "¿qué tengo que hacer?" en un
vistazo. El desglose aparece al tocar, nunca antes.

**Nada de degradados.** Se quitaron de la app a propósito.

**Cada pantalla tiene una acción obvia.** Si hay dos botones del mismo peso, uno sobra.

**El estado se dice en palabras, no solo en color.** "2 semanas tarde" gana a un punto rojo.
El color acompaña, no reemplaza.

**Nunca un día vacío ni un estado vacío mudo.** Si no hay datos, el espacio explica qué falta y
qué botón lo resuelve.

**Los números son de verdad.** Nunca placeholder ni dato inventado en una maqueta: se usa
inventario, fecha y precio reales. Un mockup con datos falsos toma decisiones falsas.

**Pesos en COP sin decimales**, con punto de miles: `$219.000`. Tallas en mono: `XS · S · M · L · XL`.

---

## 6 · Voz

Español, directo, en segunda persona. Spanglish solo en el copy de marca hacia la clienta
("Men Deserve Less"), nunca en la interfaz interna.

Los botones dicen qué pasa: **"Ya terminamos Corte"**, no "Confirmar". Los errores dicen qué
pasó y cómo se arregla. Ninguna disculpa, ningún "¡Ups!".

Un indicador se titula por lo que la persona reconoce — "Entrega próxima semana", no
"Fulfillment ETA 7d".

---

## 7 · Al diseñar una pantalla nueva

1. ¿Qué pregunta responde en tres segundos? Eso va arriba y en Cormorant grande.
2. ¿Cuál es la única acción? Ese es el botón negro.
3. Todo lo demás: fila de lista o chip, y el detalle al tocar.
4. Fondo crema, tarjetas blancas, un solo acento rosa profundo.
5. Revisa en 390px de ancho antes que en cualquier otro tamaño.
