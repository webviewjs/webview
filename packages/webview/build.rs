extern crate napi_build;

use std::{env, fs};

fn main() {
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
