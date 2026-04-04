import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DbService {
  id: string;
  name: string;
  category: string;
  base_price: number;
  description: string | null;
  duration_minutes: number | null;
  city: string | null;
  active: boolean;
  pricing_type: "fixed" | "hourly";
  created_at: string;
  updated_at: string;
}

export function useServices(activeOnly = true) {
  const [services, setServices] = useState<DbService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    setLoading(true);
    let query = supabase
      .from("services")
      .select("*")
      .order("category")
      .order("name");

    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
    } else {
      setServices((data as unknown as DbService[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, [activeOnly]);

  const categories = [...new Set(services.map((s) => s.category))];

  const getByCategory = (cat: string) =>
    services.filter((s) => s.category === cat);

  return { services, categories, loading, error, refetch: fetchServices, getByCategory };
}
