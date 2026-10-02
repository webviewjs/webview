extern crate napi_build;

use std::{env, fs};

fn main() {
  println!("cargo:rustc-check-cfg=cfg(gtk_unix)");

  let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap();
  if matches!(
    target_os.as_str(),
    "linux" | "dragonfly" | "freebsd" | "netbsd" | "openbsd"
  ) {
    println!("cargo:rustc-cfg=gtk_unix");
  }

  let manifest_path = env::var("CARGO_MANIFEST_DIR").unwrap();
  let manifest = fs::read_to_string(format!("{manifest_path}/package.json")).unwrap();
  let package_json: serde_json::Value = serde_json::from_str(&manifest).unwrap();
  let version = package_json
    .get("version")
    .and_then(|value| value.as_str())
    .expect("package.json must contain a string version field");

  println!("cargo:rustc-env=WEBVIEW_PKG_VERSION={version}");

  napi_build::setup();
}
