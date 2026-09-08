use std::time::Duration;

use tao::{
  event::{Event, WindowEvent},
  event_loop::{ControlFlow, EventLoop},
  platform::{run_return::EventLoopExtRunReturn, unix::WindowExtUnix},
  window::WindowBuilder,
};

use wry::{WebViewBuilder, WebViewBuilderExtUnix};

fn main() -> wry::Result<()> {
  let mut event_loop = EventLoop::new();

  let window = WindowBuilder::new()
    .with_title("Linux close test")
    .with_inner_size(tao::dpi::LogicalSize::new(800.0, 600.0))
    .build(&event_loop)
    .unwrap();

  let webview = WebViewBuilder::new()
    .with_html(
      r#"
        <!doctype html>
        <html>
          <body>
            <h1>Hello from Wry</h1>
          </body>
        </html>
      "#,
    )
    .build_gtk(window.default_vbox().unwrap())?;

  // One owner for BOTH resources, just like Wry's official example.
  let mut resources = Some((window, webview));
  let mut running = true;

  while running {
    event_loop.run_return(|event, _, control_flow| {
      *control_flow = ControlFlow::Poll;

      match event {
        Event::WindowEvent {
          event: WindowEvent::CloseRequested,
          ..
        } => {
          eprintln!("CLOSE REQUESTED");

          // Drop WebView + Tao Window together.
          resources.take();

          eprintln!("RESOURCES DROPPED");
          running = false;
        }

        Event::WindowEvent {
          event: WindowEvent::Destroyed,
          ..
        } => {
          eprintln!("DESTROYED");
        }

        Event::MainEventsCleared => {
          // Same basic pumping mechanism WebViewJS uses.
          *control_flow = ControlFlow::Exit;
        }

        _ => {}
      }
    });

    std::thread::sleep(Duration::from_millis(16));
  }

  eprintln!("DONE");
  Ok(())
}
