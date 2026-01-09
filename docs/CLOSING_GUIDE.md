# Guía de Cierre de Webview

Esta guía explica cómo cerrar correctamente la aplicación, ventanas y webviews en webviewrs, asegurando que todos los recursos (incluyendo carpetas temporales) se limpien adecuadamente.

## Resumen de Métodos de Cierre

### Application

#### `app.exit()`
Cierra la aplicación de forma controlada. Este método:
- Dispara el evento `ApplicationCloseRequested`
- Limpia todos los recursos de la aplicación
- Cierra todas las ventanas y webviews
- Limpia las carpetas temporales generadas por el webview

```javascript
const app = new Application();
// ... configuración de la aplicación ...
app.exit(); // Cierra la aplicación
```

#### `app.onEvent()` y `app.bind()`
Establece el manejador de eventos de la aplicación. Ambos métodos son equivalentes:

```javascript
// Usando onEvent
app.onEvent((event) => {
  if (event.event === WebviewApplicationEvent.ApplicationCloseRequested) {
    console.log('La aplicación está cerrando');
    // Realiza limpieza final aquí
    // Guardar datos, cerrar conexiones, etc.
  }
  
  if (event.event === WebviewApplicationEvent.WindowCloseRequested) {
    console.log('Una ventana solicitó cerrarse');
    // Realiza limpieza específica de la ventana
  }
});

// Usando bind (alias de onEvent)
app.bind((event) => {
  // Misma funcionalidad que onEvent
  if (event.event === WebviewApplicationEvent.ApplicationCloseRequested) {
    console.log('La aplicación está cerrando');
  }
});
```

### BrowserWindow

#### `browserWindow.hide()`
Oculta la ventana sin destruirla. Útil cuando quieres mantener la aplicación corriendo pero sin mostrar la ventana.

```javascript
browserWindow.hide(); // Oculta la ventana
// ... más tarde ...
browserWindow.show(); // Muestra la ventana nuevamente
```

#### `browserWindow.show()`
Muestra una ventana previamente oculta.

```javascript
browserWindow.show(); // Muestra la ventana
```

### Webview

#### `webview.reload()`
Recarga el contenido del webview.

```javascript
webview.reload(); // Recarga el webview
```

## Ejemplos de Uso

### Ejemplo 1: Cierre desde JavaScript

```javascript
import { Application, WebviewApplicationEvent } from 'webviewrs';

const app = new Application();

const browserWindow = app.createBrowserWindow({
  title: 'Mi Aplicación',
  width: 800,
  height: 600,
});

const webview = browserWindow.createWebview({
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mi Aplicación</title>
    </head>
    <body>
      <h1>Bienvenido</h1>
      <button onclick="closeApp()">Cerrar Aplicación</button>
      <script>
        function closeApp() {
          window.close(); // Cierra la aplicación
        }
      </script>
    </body>
    </html>
  `,
});

app.bind((event) => {
  if (event.event === WebviewApplicationEvent.ApplicationCloseRequested) {
    console.log('Limpiando recursos...');
    // Guardar datos, cerrar conexiones, etc.
  }
});

await app.run();
```

### Ejemplo 2: Cierre Programático

```javascript
import { Application } from 'webviewrs';

const app = new Application();

const browserWindow = app.createBrowserWindow();
const webview = browserWindow.createWebview({ url: 'https://example.com' });

// Cerrar la aplicación después de 10 segundos
setTimeout(() => {
  console.log('Cerrando aplicación...');
  app.exit();
}, 10000);

await app.run();
```

### Ejemplo 3: Ocultar y Mostrar Ventana

```javascript
import { Application } from 'webviewrs';

const app = new Application();

const browserWindow = app.createBrowserWindow();
const webview = browserWindow.createWebview({ url: 'https://example.com' });

// Ocultar la ventana después de 5 segundos
setTimeout(() => {
  browserWindow.hide();
}, 5000);

// Mostrar la ventana después de 10 segundos
setTimeout(() => {
  browserWindow.show();
}, 10000);

await app.run();
```

## Limpieza de Recursos

Cuando cierras la aplicación usando `app.exit()`, los siguientes recursos se limpian automáticamente:

1. **Carpetas temporales**: Las carpetas temporales generadas por el webview se eliminan
2. **Webviews**: Todos los webviews se cierran correctamente
3. **Ventanas**: Todas las ventanas se cierran correctamente
4. **Conexiones**: Las conexiones de red se cierran
5. **Memoria**: La memoria asignada se libera

## Notas Importantes

1. **Cierre Controlado**: Siempre usa `app.exit()` para cerrar la aplicación de forma controlada. Esto asegura que todos los recursos se limpien correctamente.

2. **Eventos de Cierre**: Escucha los eventos de cierre para realizar limpieza adicional antes de que la aplicación se cierre.

3. **Ocultar vs Cerrar**: Usa `hide()` cuando quieras ocultar temporalmente la ventana, y `close()` cuando quieras cerrarla definitivamente.

4. **Carpetas Temporales**: Las carpetas temporales solo se limpien cuando la aplicación se cierra completamente usando `app.exit()`.

5. **Método `.bind()`**: Ahora existe como alias de `onEvent()` para mayor familiaridad con JavaScript.

## Solución de Problemas

### Las carpetas temporales no se limpian

Asegúrate de estar usando `app.exit()` para cerrar la aplicación. Si simplemente matas el proceso, las carpetas temporales no se limpiarán.

### La aplicación no se cierra

Verifica que estés llamando a `app.exit()` y que el event loop esté corriendo. Si el event loop no está corriendo, la aplicación no responderá a las solicitudes de cierre.

### Los eventos de cierre no se disparan

Asegúrate de haber configurado el handler de eventos usando `app.onEvent()` o `app.bind()` antes de llamar a `app.run()`.

## Referencia de API

Para más información sobre la API completa, consulta la documentación principal de webviewrs.
