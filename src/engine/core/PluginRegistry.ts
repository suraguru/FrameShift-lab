import type { EffectPlugin, EffectCategory } from "@/types";

interface PluginConstructor {
  new (): EffectPlugin;
}

interface PluginEntry {
  id: string;
  name: string;
  category: EffectCategory;
  ctor: PluginConstructor;
}

export const pluginRegistry = {
  plugins: new Map<string, PluginEntry>(),
  register(id: string, name: string, category: EffectCategory, ctor: PluginConstructor): void {
    this.plugins.set(id, { id, name, category, ctor });
  },
  get(id: string): PluginEntry | undefined {
    return this.plugins.get(id);
  },
  createInstance(id: string): EffectPlugin | null {
    const entry = this.plugins.get(id);
    if (!entry) {
      console.error(`[PluginRegistry] Plugin not found: ${id}`);
      return null;
    }
    const instance = new entry.ctor();
    instance.instanceId = `${id}_${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;
    return instance;
  },
  getAll(): PluginEntry[] {
    return Array.from(this.plugins.values());
  },
  getByCategory(category: EffectCategory): PluginEntry[] {
    return this.getAll().filter((p) => p.category === category);
  },
  getCategories(): EffectCategory[] {
    const cats = new Set<EffectCategory>();
    this.plugins.forEach((p) => cats.add(p.category));
    return Array.from(cats);
  },
  getAllIds(): string[] {
    return Array.from(this.plugins.keys());
  }
};
