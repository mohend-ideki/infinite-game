/**
 * Bus d'effets transitoires (particules, secousse caméra) découplé du store
 * React : aucun re-rendu, les composants 3D s'abonnent directement.
 */

export interface BurstEvent {
  position: [number, number, number];
  color: string;
  rare: boolean;
}

export interface ShakeEvent {
  intensity: number;
}

type EventMap = {
  burst: BurstEvent;
  shake: ShakeEvent;
};

type Listener<K extends keyof EventMap> = (payload: EventMap[K]) => void;

const channels: { [K in keyof EventMap]: Set<Listener<K>> } = {
  burst: new Set(),
  shake: new Set(),
};

export const effectsBus = {
  on<K extends keyof EventMap>(event: K, listener: Listener<K>): () => void {
    channels[event].add(listener);
    return () => {
      channels[event].delete(listener);
    };
  },
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    for (const listener of channels[event]) {
      listener(payload);
    }
  },
};

/** Retour haptique mobile, silencieusement ignoré si non supporté. */
export function haptic(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}
