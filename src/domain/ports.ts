export interface Ports {
  now(): string;
  id(): string;
}

export function defaultPorts(): Ports {
  return {
    now: () => new Date().toISOString(),
    id: () => `id-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };
}
