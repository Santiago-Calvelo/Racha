import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Pagina } from '../api/tipos';
import { mensaje } from './useConsulta';

export function usePagina<T>(
  consultar: (pagina: number, signal: AbortSignal) => Promise<Pagina<T>>,
) {
  const [items, setItems] = useState<T[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const pagina = useRef(0);
  const actual = useRef<AbortController | null>(null);
  const cargar = useCallback(
    async (reiniciar: boolean) => {
      if (!reiniciar && actual.current) return;
      actual.current?.abort();
      const controller = new AbortController();
      actual.current = controller;
      const siguiente = reiniciar ? 1 : pagina.current + 1;
      setCargando(true);
      setError(null);
      try {
        const respuesta = await consultar(siguiente, controller.signal);
        if (!controller.signal.aborted) {
          setItems((prev) =>
            reiniciar ? respuesta.items : [...prev, ...respuesta.items],
          );
          pagina.current = siguiente;
          setHayMas(respuesta.pagina * respuesta.limite < respuesta.total);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(mensaje(e));
      } finally {
        if (!controller.signal.aborted) {
          actual.current = null;
          setCargando(false);
        }
      }
    },
    [consultar],
  );
  useEffect(() => {
    setItems([]);
    pagina.current = 0;
  }, [consultar]);
  useFocusEffect(
    useCallback(() => {
      void cargar(true);
      return () => actual.current?.abort();
    }, [cargar]),
  );
  return {
    items,
    cargando,
    error,
    hayMas,
    refrescar: () => void cargar(true),
    mas: () => void cargar(false),
  };
}
