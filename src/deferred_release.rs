//! Native windows and webviews can be closed from inside their own callbacks, for
//! example by an exposed IPC function that calls `app.exit()`. Dropping them there
//! can free the handler that is still running, so their release is queued here and
//! performed once the current native callback has returned.

use std::any::Any;
use std::cell::RefCell;

thread_local! {
  static PENDING: RefCell<Vec<Box<dyn Any>>> = const { RefCell::new(Vec::new()) };
}

pub(crate) fn defer_release<T: 'static>(value: T) {
  PENDING.with(|pending| pending.borrow_mut().push(Box::new(value)));
}

/// Drops every queued handle. Called from the event-loop pump, outside any native callback.
pub(crate) fn release_deferred() {
  loop {
    let batch = PENDING.with(|pending| std::mem::take(&mut *pending.borrow_mut()));
    if batch.is_empty() {
      break;
    }
    drop(batch);
  }
}
