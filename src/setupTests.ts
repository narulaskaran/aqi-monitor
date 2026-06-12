import "@testing-library/jest-dom";

// Node 22+ exposes a global `localStorage` whose methods throw (or are
// missing) unless Node is started with --localstorage-file. That global
// shadows jsdom's implementation, so install an in-memory stub that works
// regardless of Node version.
const createStorageMock = (): Storage => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

for (const target of [globalThis, globalThis.window] as const) {
  Object.defineProperty(target, "localStorage", {
    value: createStorageMock(),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(target, "sessionStorage", {
    value: createStorageMock(),
    writable: true,
    configurable: true,
  });
}

// Mock window.matchMedia for jsdom
globalThis.window.matchMedia =
  globalThis.window.matchMedia ||
  function (query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: function () {}, // deprecated
      removeListener: function () {}, // deprecated
      addEventListener: function () {},
      removeEventListener: function () {},
      dispatchEvent: function () {
        return false;
      },
    };
  };
