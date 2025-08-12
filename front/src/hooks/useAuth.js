import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function useAuth() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const r = await api.get("/api/me");
    setMe(r.ok ? await r.json() : null);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);
  return { me, loading, refresh };
}
