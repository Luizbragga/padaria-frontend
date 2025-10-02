// padaria-frontend/src/utils/logger.js

// Em dev: passa tudo para o console.
// Em prod: deixa só warn/error; silencia log/info/debug para evitar vazamento/acúmulo.
const isDev = import.meta.env?.DEV === true;

function safeCall(fn, ...args) {
  try {
    fn?.(...args);
  } catch {
    /* evita quebrar UI por causa de console */
  }
}

export const logger = {
  debug: (...args) => {
    if (isDev) safeCall(console.debug, ...args);
  },
  log: (...args) => {
    if (isDev) safeCall(console.log, ...args);
  },
  info: (...args) => {
    if (isDev) safeCall(console.info, ...args);
  },
  warn: (...args) => {
    safeCall(console.warn, ...args);
  },
  error: (...args) => {
    safeCall(console.error, ...args);
  },
};

// Export default para facilitar imports
export default logger;
