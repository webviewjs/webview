import { Application } from '../index.js';

function exampleRecreateWindows() {
  console.log('Recrear ventanas');
  
  const app = new Application({ preventClose: true });
  
  const windows = new Map();
  
  function createWindow(title:string) {
    const window = app.createBrowserWindow({ title });
    windows.set(window.id, window);
    console.log(`Creada ventana ${title} con ID: ${window.id}`);
    return window;
  }
  
  function destroyWindow(windowId:number) {
    const window = windows.get(windowId);
    if (window) {
      window.destroy();
      windows.delete(windowId);
      console.log(`Ventana ${windowId} destruida`);
    }
  }
  
  // Crear ventana
  let window1 = createWindow('Ventana 1');
  
  console.log('Programando setTimeout para destruir ventana en 2000ms...');
  
  // IMPORTANTE: Todos los setTimeout deben programarse ANTES de llamar a app.run()
  // porque app.run() es una llamada BLOQUEANTE que inicia el event loop de Rust.
  // Una vez que app.run() se ejecuta, el thread principal de JavaScript se bloquea
  // y ningún código JavaScript adicional se ejecutará.
  
  // Programar destrucción y recreación de ventana después de 2 segundos
  setTimeout(() => {
    console.log('Ejecutando setTimeout: destruyendo ventana...');
    destroyWindow(window1.id);
    window1 = createWindow('Ventana 1 (recreada)');
    console.log('Ejecutando setTimeout: ventana recreada');
  }, 2000);
  
  console.log('Programando setTimeout para salir en 5000ms...');
  
  // Programar cierre de aplicación después de 5 segundos
  setTimeout(() => {
    console.log('Ejecutando setTimeout: saliendo de la aplicación...');
    app.exit();
  }, 5000);
  
  console.log('Iniciando app.run()...');
  
  // Iniciar el event loop de Rust (esto bloqueará el thread principal de JavaScript)
  app.run();
  
  console.log('app.run() ha terminado');
}


exampleRecreateWindows();

