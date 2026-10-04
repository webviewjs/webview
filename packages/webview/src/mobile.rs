use napi::{Error, Status};

pub(crate) fn unsupported_feature_error(feature: &str) -> Error {
  let platform = if cfg!(target_os = "ios") {
    "iOS"
  } else {
    "Android"
  };

  Error::new(
    Status::GenericFailure,
    format!("{platform} does not support {feature}"),
  )
}
