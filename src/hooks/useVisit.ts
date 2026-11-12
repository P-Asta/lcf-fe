import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useVisit = () => useQuery({ queryKey: ["visit"], queryFn: api.visit, staleTime: Infinity, gcTime: Infinity, retry: false });
