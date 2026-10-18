# Visor de obras

`shared/artwork-viewer` presenta los datos ya cargados por Galería o Home; no inyecta servicios HTTP ni modifica rutas, filtros o paginación. Sustituye las dos implementaciones anteriores y conserva sus metadatos. La Home proporciona sus campos adicionales como pares de etiqueta y valor.

## Navegación y límites

- Catálogo y colección: orden exacto de las tarjetas de la página actual (hasta 12 obras).
- Portada: solo las obras destacadas de la colección desde la que se abre.
- Home: conjunto de obras destacadas ya cargado, en su orden original.
- URL directa de detalle: una obra; no se ofrecen flechas hacia resultados ajenos a ese enlace.
- No se navega a otras páginas de resultados ni se realizan consultas adicionales. Los extremos se deshabilitan, sin navegación circular entre obras.
- Izquierda/derecha recorren obras. Las flechas y miniaturas de «Imagen» se mantienen separadas y recorren las fotografías de una misma obra.

## Viewport y accesibilidad

El modal ocupa la altura dinámica disponible, con márgenes y safe areas. Mantiene dos columnas por encima de 700 px; debajo se apilan la imagen y la información. La información tiene desplazamiento independiente, accesible por teclado, mientras la pintura y el cierre permanecen visibles. En móvil se reserva una franja superior para que el cierre no cubra la pintura.

Al abrir se conserva el elemento activador, la posición del documento y sus estilos de overflow/padding. Se bloquea el fondo y se marca como inert, respetando su estado previo. Al cerrar o destruir el visor se restaura todo y se devuelve el foco si el activador sigue disponible. Escape cierra; Tab y Mayús+Tab permanecen en el diálogo. Controles de al menos 44 px, título de diálogo y mensajes de carga accesibles. Se respetan las preferencias de movimiento reducido.

Las descripciones y títulos extensos no se recortan: provocan scroll solo en la información. La imagen usa contain y mantiene un área estable durante la carga y el cambio; se informa de fallos de carga sin ocultar la ficha.

## Verificación

```sh
npm run build
node --test scripts/verify-artworks.cjs
node scripts/verify-artworks-browser.cjs --viewer
node scripts/verify-artworks-browser.cjs
node scripts/verify-artworks-browser.cjs --cards --urban
```

El navegador usa datos controlados e imágenes reales locales para comprobar tamaños, scroll, foco, restauración, descripciones extensas, navegación entre obras e imágenes, y ausencia de peticiones API al navegar dentro del visor. Capturas en `.angular/artwork-viewer-desktop.png` y `.angular/artwork-viewer-mobile.png`.
