import { useEffect, useState } from "react";
import type { FlowsDocument } from "./types";
import { emptyDocument, deserialize } from "./service";

const LOCAL_KEY = "hermes.flows.v1";

/** Read-only for now — no cloud sync yet (deferred per the build plan until
 *  there's a real reason to sync run history across devices, same as
 *  Dashboard's original inline read). Written by whatever eventually posts
 *  real n8n execution results and the heartbeat; until then this is just
 *  empty and the UI shows its own empty states. */
export function useFlowsDocument(): FlowsDocument {
  const [doc, setDoc] = useState<FlowsDocument>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? deserialize(raw) : emptyDocument();
    } catch {
      return emptyDocument();
    }
  });

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LOCAL_KEY && e.newValue) setDoc(deserialize(e.newValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return doc;
}
