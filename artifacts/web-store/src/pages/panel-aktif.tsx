import { useEffect } from "react";
import { useLocation } from "wouter";

export default function PanelAktif() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/my-panels"); }, [setLocation]);
  return null;
}
