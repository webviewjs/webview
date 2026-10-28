(function () {
  if (!window.__webviewjs__) {
    let __id = 0;
    const __p = new Map();
    window.__webviewjs__ = {
      resolve: function (id, val) {
        const e = __p.get(id);
        if (e) {
          __p.delete(id);
          e[0](val);
        }
      },
      reject: function (id, message, name) {
        const e = __p.get(id);
        if (e) {
          __p.delete(id);
          const err = new Error(message);
          err.name = name || 'Error';
          e[1](err);
        }
      },
      call: function (ns, method, args) {
        let argsJson;
        try {
          argsJson = JSON.stringify(args);
          if (argsJson === undefined) throw new Error('not serialisable');
        } catch {
          const err = new Error('Arguments are not JSON-serialisable');
          err.name = 'SerializationError';
          return Promise.reject(err);
        }
        return new Promise(function (res, rej) {
          const id = ++__id;
          __p.set(id, [res, rej]);
          window.ipc.postMessage(
            JSON.stringify({ __e: true, ns: ns, method: method, id: id, args: JSON.parse(argsJson) }),
          );
        });
      },
    };
  }
  const __config = __WEBVIEWJS_EXPOSE_CONFIG__;
  const __ns = Object.assign({}, __config.statics);
  for (const fn of __config.funcs) {
    (function (m) {
      __ns[m] = function () {
        return window.__webviewjs__.call(__config.name, m, Array.from(arguments));
      };
    })(fn);
  }
  window[__config.name] = __ns;
})();
