# Nexo · Administrador de proveedores

Aplicación frontend desarrollada con **React, TypeScript, Tailwind CSS y componentes shadcn/ui sobre Radix**. Permite consultar, registrar, editar, activar e inactivar proveedores. Los datos se conservan en `localStorage`.

## Abrir y ejecutar en Visual Studio Code

1. Instala **Node.js 22.12 o superior**, que incluye npm, desde https://nodejs.org/.
2. Extrae el archivo ZIP. No trabajes dentro de la carpeta comprimida.
3. En VS Code, selecciona **Archivo → Abrir carpeta** y abre `proveedores`, la carpeta que contiene `package.json`.
4. Selecciona **Terminal → Nueva terminal**. En Windows, copia y pega:

```powershell
npm.cmd install
npm.cmd run dev
```

5. Abre **http://localhost:4173/** en tu navegador. Mantén la terminal abierta mientras usas la aplicación.

En macOS/Linux usa `npm install` y `npm run dev`. Para detener el servidor, presiona **Ctrl + C** en la terminal. Para volver a abrir el proyecto solo necesitas `npm.cmd run dev`; la instalación se realiza la primera vez o al cambiar las dependencias.

Guarda cualquier cambio de código con **Ctrl + S** y el navegador se actualizará. No abras `index.html` con doble clic ni con Live Server: este proyecto se ejecuta con Vite.

### Si utilizas Visual Studio

Abre la misma carpeta con **Archivo → Abrir → Carpeta** y ejecuta los comandos anteriores en una terminal ubicada en esa carpeta. Es un proyecto de JavaScript/TypeScript; no necesita una solución `.sln`. Para esta tarea, VS Code ofrece un flujo más directo.

## Funciones incluidas

- Todos los campos solicitados: nombre, razón social, NIT, NRC, teléfono, correo, dirección y estado.
- Búsqueda por nombre, NIT o correo, sin distinguir mayúsculas ni tildes. El NIT también puede buscarse sin guiones.
- Filtros de todos, activos e inactivos y paginación de seis registros.
- Registro y edición con nombre y NIT obligatorios; correo válido si se completa.
- Comprobación de NIT duplicado. No se valida su autenticidad fiscal.
- Activación e inactivación con confirmación; no hay eliminación física de proveedores.
- Tabla en pantallas desde 1024 px y tarjetas en pantallas menores, sin desplazamiento horizontal.
- Guardado local, mensajes de éxito/error, estados vacíos y navegación por teclado.

## Qué archivo modificar

| Quiero cambiar…                      | Archivo o carpeta                                    |
| ------------------------------------ | ---------------------------------------------------- |
| Título y organización de la pantalla | `src/App.tsx`                                        |
| Colores y estilos generales          | `src/index.css`                                      |
| Barra lateral, encabezado y ayuda    | `src/components/layout/AppLayout.tsx`                |
| Formulario de registro y edición     | `src/components/proveedores/FormularioProveedor.tsx` |
| Tabla para computadora               | `src/components/proveedores/TablaProveedores.tsx`    |
| Tarjetas para móvil                  | `src/components/proveedores/TarjetasProveedores.tsx` |
| Buscador y filtros                   | `src/components/proveedores/FiltrosProveedores.tsx`  |
| Validaciones y búsqueda              | `src/lib/proveedores.ts`                             |
| Guardado y lectura del navegador     | `src/lib/almacenamiento.ts`                          |
| Operaciones del directorio           | `src/hooks/useProveedores.ts`                        |
| Datos de ejemplo iniciales           | `src/data/proveedores.ts`                            |
| Estructura y tipos de un proveedor   | `src/types/proveedor.ts`                             |
| Componentes reutilizables shadcn/ui  | `src/components/ui/`                                 |

Los nombres de las funciones principales y sus comentarios están en español. Los componentes shadcn/ui se incluyen como código editable; `components.json` mantiene la configuración para añadir otros componentes.

## Datos guardados

La clave utilizada es `nexo.proveedores.v1`. La primera visita carga ocho proveedores ficticios. Después, el programa lee lo que guardaste en ese navegador y esa dirección web. Cambiar los datos iniciales en el código no reemplaza registros que ya estén guardados.

Los datos no se comparten entre dispositivos ni entre la dirección local y Azure. Borrar los datos del sitio elimina el contenido guardado; la siguiente visita volverá a cargar los ejemplos. No se envía información a un servidor y no hay base de datos ni autenticación. Los mensajes de éxito solo aparecen si la escritura se completa.

## Pruebas y versión final

En la terminal de Windows:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Las pruebas automatizadas cubren búsqueda, filtros, validación y persistencia. El build comprueba los tipos y genera `dist/`, que es la carpeta que se publica. No necesitas editarla: se vuelve a generar desde `src/`.

Para una prueba manual: registra un proveedor, recarga, búscalo, edítalo, inactívalo y comprueba el filtro de inactivos. Después actívalo otra vez. Intenta guardar un formulario vacío o un correo incorrecto y verifica los mensajes.

## Subir el código a GitHub

Este paquete todavía no está publicado en una cuenta de GitHub. Crea un repositorio vacío llamado `nexo-proveedores` y, desde la carpeta del proyecto, ejecuta estos comandos. Sustituye `TU_USUARIO` por tu usuario real:

```bash
git init
git add .
git commit -m "Crear administrador de proveedores"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/nexo-proveedores.git
git push -u origin main
```

Git puede solicitar que configures tu nombre y correo si es tu primer uso. `.gitignore` excluye las dependencias, la compilación y los archivos de entorno.

## Publicar en Azure Static Web Apps

**Estado de esta entrega: configuración preparada; despliegue pendiente. Todavía no hay una URL pública de Azure.**

1. En https://portal.azure.com/, crea un recurso **Static Web App**. Selecciona tu suscripción, un grupo de recursos, el nombre `nexo-proveedores` y el plan **Free**. Selecciona **Other / Otro** como origen para utilizar el workflow incluido.
2. En el recurso, abre **Manage deployment token / Administrar token de implementación** y copia el token.
3. En tu repositorio GitHub, abre **Settings → Secrets and variables → Actions → New repository secret**. Nómbralo exactamente `AZURE_STATIC_WEB_APPS_API_TOKEN` y guarda allí el token. No lo pegues en el código ni en el README.
4. Abre **Actions → Publicar en Azure → Run workflow**. En adelante, los cambios enviados a `main` también publican una nueva versión.
5. Cuando termine correctamente, copia la URL desde **Overview / Información general** del recurso Azure y compruébala en tu navegador. Esa será la URL que entregarás.

El workflow compila con Node 22, ejecuta las pruebas y publica `dist` con `skip_app_build: true`. En esa modalidad, `app_location` es `dist` y `output_location` queda vacío. `public/staticwebapp.config.json` se copia automáticamente a la compilación. El primer workflow de publicación mostrará un error claro si aún no has agregado el token; puedes volver a ejecutarlo al configurarlo.

Para cerrar la entrega, añade aquí los enlaces reales del repositorio y de Azure, y la fecha en que verificaste el sitio. No se incluyen enlaces simulados.

Referencias oficiales consultadas:

- [Configuración de compilación de Azure](https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration)
- [Creación de una Static Web App](https://learn.microsoft.com/en-us/azure/static-web-apps/get-started-portal)
- [Token de implementación](https://learn.microsoft.com/en-us/azure/static-web-apps/deployment-token-management)
- [shadcn/ui con Vite](https://ui.shadcn.com/docs/installation/vite)

La atribución de los componentes de terceros se encuentra en `THIRD_PARTY_NOTICES.md`.
