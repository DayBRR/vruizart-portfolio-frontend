# VRuizArt Portfolio Frontend

Frontend Angular del portfolio artístico de Vicente Ruiz. La home reproduce el HTML personalizado suministrado y mantiene el contenido en mocks tipados para facilitar la conexión posterior con Spring Boot.

## Desarrollo

```bash
npm install
npm start
```

Abrir `http://localhost:4200`.

## Arquitectura
- `core/models`: contratos de datos
- `core/services/mock-portfolio.data.ts`: contenido temporal extraído del HTML
- `core/services/portfolio-api.service.ts`: cliente HTTP preparado para `/api/public`
- `features/home`: home fiel al diseño actual
- `features/*`: rutas base para las páginas interiores
- `shared`: cabecera y footer
- `assets/images`: imágenes extraídas del HTML original, ya no embebidas en base64

## Siguiente fase
Sustituir los mocks de la home por llamadas al backend y cargar el contenido real mediante scripts SQL hasta que exista el panel de administración.
