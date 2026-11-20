import { useCallback, useEffect, useRef, useState } from "react";
import type { Inventory } from "../domain/inventory";
import {
  INVENTORY_STORAGE_KEY,
  loadInventory,
  readStoredInventory,
  saveInventory,
} from "../domain/storage";

export function useInventory() {
  const [initial] = useState(() => loadInventory());
  const [inventory, setInventory] = useState<Inventory>(initial.inventory);
  const inventoryRef = useRef(inventory);
  const [storageStatus, setStorageStatus] = useState(initial.storageStatus);
  const hasSavedSnapshot = useRef(initial.storageStatus !== "unavailable");

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if ((event.key !== INVENTORY_STORAGE_KEY && event.key !== null) || !hasSavedSnapshot.current) return;
      const next = loadInventory();
      inventoryRef.current = next.inventory;
      setInventory(next.inventory);
      setStorageStatus(next.storageStatus);
      hasSavedSnapshot.current = next.storageStatus !== "unavailable";
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const updateInventory = useCallback(
    async (change: Inventory | ((current: Inventory) => Inventory)) => {
      const transaction = () => {
      let current = inventoryRef.current;
      if (hasSavedSnapshot.current) {
        try {
          const serialized = globalThis.localStorage.getItem(INVENTORY_STORAGE_KEY);
          const latest = serialized ? readStoredInventory(serialized) : null;
          if (latest) current = latest;
        } catch {
          hasSavedSnapshot.current = false;
        }
      }
      const next =
        typeof change === "function" ? change(current) : change;
      inventoryRef.current = next;
      setInventory(next);
      try {
        const saved = saveInventory(next);
        hasSavedSnapshot.current = saved;
        setStorageStatus(saved ? "ready" : "unavailable");
      } catch {
        // A storage failure must not block the current session's inventory changes.
        hasSavedSnapshot.current = false;
        setStorageStatus("unavailable");
      }
      };
      const locks = globalThis.navigator?.locks;
      if (locks) await locks.request(INVENTORY_STORAGE_KEY, transaction);
      else transaction();
    },
    [],
  );
  return { inventory, updateInventory, storageStatus };
}
