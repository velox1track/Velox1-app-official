const listeners = new Map();

export function on(eventName, handler) {
  const arr = listeners.get(eventName) || [];
  arr.push(handler);
  listeners.set(eventName, arr);
  return () => off(eventName, handler);
}

export function off(eventName, handler) {
  const arr = listeners.get(eventName) || [];
  listeners.set(eventName, arr.filter(fn => fn !== handler));
}

export function emit(eventName, payload) {
  const arr = listeners.get(eventName) || [];
  arr.forEach(fn => {
    try { fn(payload); } catch (e) { /* noop */ }
  });
}

export default { on, off, emit };

