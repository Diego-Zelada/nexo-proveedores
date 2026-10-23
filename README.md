# Nexo · Administrador de proveedores

**Autor:** Diego Alejandro Zelada Martinez

Desarrollé esta aplicación para administrar proveedores desde una página web. Permite registrar sus datos, buscarlos, editarlos y cambiar su estado entre activo e inactivo. La información se conserva al recargar la página porque se guarda en el navegador mediante `localStorage`.

## Enlaces del proyecto

- **Aplicación publicada:** [Nexo Proveedores en Azure](https://kind-mud-024de6410.6.azurestaticapps.net)
- **Código fuente:** [Repositorio en GitHub](https://github.com/Diego-Zelada/nexo-proveedores)
- **Alojamiento:** Azure Static Web Apps, plan Free.
- **Fecha de verificación:** 23 de octubre de 2026.

## Tecnologías utilizadas

Utilicé React para construir la interfaz, TypeScript para definir los tipos de datos, Tailwind CSS para los estilos y componentes de shadcn/ui sobre Radix para los formularios, menús y ventanas de confirmación. También utilicé Vite para ejecutar y compilar el proyecto, Vitest para las pruebas y GitHub Actions para verificar el código y publicarlo en Azure.

## Funciones de la aplicación

- Registrar y editar nombre, razón social, NIT, NRC, teléfono, correo, dirección y estado.
- Buscar proveedores por nombre, NIT o correo.
- Filtrar todos los proveedores, solamente los activos o solamente los inactivos.
- Mostrar las cantidades de proveedores totales, activos e inactivos.
- Validar el nombre y el NIT como obligatorios y el formato del correo si se completa.
- Evitar registros con un NIT que ya esté guardado.
- Activar e inactivar proveedores con confirmación, conservando sus datos.
- Mostrar una tabla en computadora y tarjetas en pantallas pequeñas.
- Guardar los cambios en el navegador y mostrar mensajes de confirmación o error.

## 1. Requisitos

Para ejecutar el proyecto en una computadora se necesita:

- [Node.js](https://nodejs.org/) versión **22.12 o superior**, que incluye npm.
- [Git](https://git-scm.com/) para descargar el repositorio y subir cambios.
- [Visual Studio Code](https://code.visualstudio.com/).
- Un navegador y conexión a internet para descargar las dependencias.

En Windows se puede comprobar la instalación desde la terminal con:

```powershell
node --version
npm.cmd --version
git --version
```

## 2. Descargar e instalar el proyecto

1. Abrir una terminal en la carpeta donde se quiera guardar el proyecto.
2. Descargar el repositorio y entrar en su carpeta:

   ```powershell
   git clone https://github.com/Diego-Zelada/nexo-proveedores.git
   cd nexo-proveedores
   ```

3. En VS Code, seleccionar **Archivo → Abrir carpeta** y abrir esa carpeta. Es la que contiene `package.json`.
4. Seleccionar **Terminal → Nueva terminal**.
5. Instalar las dependencias:

   ```powershell
   npm.cmd install
   ```

También se puede descargar desde **Code → Download ZIP** en GitHub, extraer el archivo y seguir desde el paso 3.

## 3. Ejecutar la aplicación

1. En la terminal de VS Code, dentro de la carpeta del proyecto, ejecutar:

   ```powershell
   npm.cmd run dev
   ```

2. Abrir [http://localhost:4173/](http://localhost:4173/) en el navegador. Si Vite muestra otro puerto porque ese está ocupado, utilizar la dirección que indique la terminal.
3. Mantener la terminal abierta mientras se trabaja. Los cambios guardados con **Ctrl + S** se reflejan en el navegador.
4. Para detener el servidor, presionar **Ctrl + C** en la terminal.

Después de la primera instalación, para volver a ejecutarlo basta con abrir la carpeta y usar `npm.cmd run dev`. Si cambian las dependencias, se vuelve a ejecutar `npm.cmd install`.

Los comandos de este README están escritos para Windows. En macOS o Linux se utiliza `npm` en lugar de `npm.cmd`.

### Abrirlo en Visual Studio

También se puede abrir la carpeta desde **Archivo → Abrir → Carpeta** en Visual Studio y ejecutar los mismos comandos en su terminal. El proyecto se ejecuta con Vite y no necesita un archivo de solución `.sln`.

## 4. Cómo usar la aplicación

1. Presionar **Nuevo proveedor** para abrir el formulario.
2. Completar los datos y guardar. El nombre y el NIT son obligatorios; los demás campos son opcionales.
3. Utilizar el buscador para encontrar un proveedor por nombre, NIT o correo.
4. Seleccionar **Todos**, **Activos** o **Inactivos** para filtrar los registros.
5. Abrir el menú de los tres puntos de un proveedor para editar sus datos o cambiar su estado.
6. Confirmar el cambio para activar o inactivar al proveedor.

Conservé los registros mediante el cambio de estado, como pide el proyecto. No incluí una opción para eliminarlos físicamente.

### Cómo se guardan los datos

La primera vez que se abre la aplicación aparecen ocho proveedores ficticios. Los cambios se guardan en `localStorage` con la clave `nexo.proveedores.v1`.

Cada navegador y dirección web tiene sus propios datos. Por eso, los proveedores registrados en `localhost` no aparecen automáticamente en Azure ni en otro dispositivo. Si se borran los datos del sitio, se pierde la información guardada y se vuelven a cargar los ejemplos iniciales. Esta versión no utiliza una base de datos en un servidor ni tiene inicio de sesión.

## 5. Organización del código

Separé el proyecto en componentes para que cada parte tenga una función definida:

| Archivo o carpeta | Función |
| --- | --- |
| `src/App.tsx` | Organiza la pantalla principal y conecta sus componentes. |
| `src/components/proveedores/` | Contiene el formulario, tabla, tarjetas, filtros, resumen y confirmaciones. |
| `src/components/layout/` | Contiene la barra lateral, el encabezado y la guía rápida. |
| `src/components/ui/` | Contiene los componentes reutilizables de interfaz. |
| `src/hooks/useProveedores.ts` | Maneja la carga, registro, edición y cambio de estado de los proveedores. |
| `src/lib/proveedores.ts` | Contiene las validaciones, la búsqueda y los filtros. |
| `src/lib/almacenamiento.ts` | Lee y guarda los registros en el navegador. |
| `src/types/proveedor.ts` | Define los campos y tipos de un proveedor. |
| `src/data/proveedores.ts` | Contiene los proveedores ficticios iniciales. |
| `src/index.css` | Define los estilos generales. |
| `.github/workflows/` | Contiene los procesos de verificación y publicación automática. |
| `public/staticwebapp.config.json` | Configura la navegación de la aplicación en Azure. |

## 6. Pruebas y compilación

Para ejecutar las pruebas automatizadas:

```powershell
npm.cmd test
```

Estas pruebas revisan la búsqueda, los filtros, las validaciones y el guardado de datos.

Para comprobar los tipos de TypeScript y generar la versión que se publica:

```powershell
npm.cmd run build
```

El resultado se guarda en `dist/`. Para revisar esa versión en la computadora:

```powershell
npm.cmd run preview
```

Después se abre la dirección que muestre la terminal. Si el servidor de desarrollo sigue abierto, primero se detiene con **Ctrl + C**.

El 23 de octubre de 2026 comprobé que la publicación en GitHub Actions terminó correctamente y que la aplicación cargó desde Azure. También registré un proveedor de prueba y confirmé que seguía apareciendo después de recargar la página.

## 7. Cómo subí el código a GitHub

Primero creé un repositorio vacío en GitHub llamado `nexo-proveedores`. Después, desde la carpeta del proyecto en VS Code, inicialicé Git, guardé los archivos y conecté el repositorio remoto:

```powershell
git init
git add .
git commit -m "Crear administrador de proveedores"
git branch -M main
git remote add origin https://github.com/Diego-Zelada/nexo-proveedores.git
git push -u origin main
```

Estos comandos corresponden a la subida inicial. Al descargar el proyecto con `git clone`, la conexión con GitHub ya queda configurada. El archivo `.gitignore` excluye carpetas como `node_modules` y `dist` para mantener el repositorio con el código fuente y su configuración.

## 8. Cómo hice el despliegue en Azure

### Crear el recurso

1. Ingresé al [portal de Azure](https://portal.azure.com/) y abrí **Static Web Apps**.
2. Seleccioné **Create** y elegí mi suscripción.
3. Creé el grupo de recursos `rg-nexo-proveedores`.
4. Escribí `Nexo-Proveedores` como nombre de la aplicación.
5. Seleccioné el plan **Free**.
6. En **Source**, seleccioné **Other**, porque el repositorio ya incluía el proceso de publicación.
7. En **Deployment configuration**, dejé seleccionada la opción **Deployment token**.
8. En **Advanced**, utilicé **Central US** como región.
9. Abrí **Review + create**, comprobé que el plan fuera Free y presioné **Create**.
10. Cuando terminó la creación, seleccioné **Go to resource**.

Al principio intenté utilizar Azure for Students, pero esa suscripción tenía una restricción de regiones que no coincidía con las disponibles para Static Web Apps. Finalmente creé el recurso con mi cuenta personal, en la suscripción `Azure subscription 1`, donde la creación en Central US sí terminó correctamente.

### Conectar Azure con GitHub

1. En el recurso de Azure abrí **Manage deployment token** y copié el token.
2. En GitHub entré al repositorio y abrí **Settings → Secrets and variables → Actions**.
3. Seleccioné **New repository secret**.
4. Utilicé exactamente este nombre:

   ```text
   AZURE_STATIC_WEB_APPS_API_TOKEN
   ```

5. Pegué el token de Azure en el campo **Secret** y presioné **Add secret**. El token se guarda como secreto y no se incluye en el código ni en este documento.
6. Abrí **Actions → Publicar en Azure → Run workflow**.
7. Seleccioné la rama `main` y ejecuté el proceso.
8. Esperé a que terminara con la marca verde y abrí la dirección pública de Azure para comprobar el resultado.

El archivo `.github/workflows/azure-static-web-apps.yml` instala las dependencias con `npm ci`, ejecuta las pruebas, compila el proyecto y publica la carpeta `dist` en Azure. Utiliza Node.js 22 y el secreto configurado en GitHub. Como la compilación ya se hace en GitHub Actions, el paso de Azure utiliza `skip_app_build: true` y `app_location: dist`.

También incluí el proceso **Verificar proyecto**, que ejecuta las pruebas y la compilación. Este proceso comprueba el código; **Publicar en Azure** es el que realiza el despliegue.

## 9. Cómo subir cambios después

Después de modificar y guardar los archivos, reviso los cambios en la terminal:

```powershell
git status
```

Luego los guardo en Git y los envío a GitHub:

```powershell
git add .
git commit -m "Actualizar proyecto"
git push
```

Cada cambio enviado a `main` inicia automáticamente una nueva publicación. Se puede revisar su resultado en **Actions → Publicar en Azure** y, cuando termine, recargar la página pública para ver la actualización.

## Referencias

- [Crear una aplicación en Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/get-started-portal)
- [Token de implementación de Azure](https://learn.microsoft.com/en-us/azure/static-web-apps/deployment-token-management)
- [Configuración de compilación en Azure](https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration)

La atribución y las licencias de los componentes de terceros están en `THIRD_PARTY_NOTICES.md`.