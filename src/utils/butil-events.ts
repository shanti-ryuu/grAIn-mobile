type ButilReactionListener = (visible: boolean) => void;

const listeners = new Set<ButilReactionListener>();

export function emitButilReactionVisibility(visible: boolean) {
  listeners.forEach((listener) => listener(visible));
}

export function subscribeButilReactionVisibility(listener: ButilReactionListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
