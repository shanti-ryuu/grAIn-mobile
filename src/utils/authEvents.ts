type LogoutListener = () => void;

const logoutListeners = new Set<LogoutListener>();

export function addLogoutListener(listener: LogoutListener): () => void {
  logoutListeners.add(listener);
  return () => {
    logoutListeners.delete(listener);
  };
}

export function emitLogout(): void {
  logoutListeners.forEach((listener) => listener());
}
