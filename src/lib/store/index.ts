import type { Store } from "./types";
import { FileStore } from "./file";
import { PostgresStore } from "./postgres";
import { seedDemo } from "../seed";

const g = globalThis as unknown as { __aeraStore?: Promise<Store> };

export function getStore(): Promise<Store> {
  if (!g.__aeraStore) {
    g.__aeraStore = (async () => {
      const store: Store = process.env.DATABASE_URL
        ? new PostgresStore(process.env.DATABASE_URL)
        : new FileStore();
      if (process.env.SEED_DEMO !== "false" && (await store.listClients()).length === 0) {
        await seedDemo(store);
      }
      return store;
    })();
    g.__aeraStore.catch(() => (g.__aeraStore = undefined));
  }
  return g.__aeraStore;
}

export type { Store };
