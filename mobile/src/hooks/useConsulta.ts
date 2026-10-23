import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

export const mensaje = (error: unknown) =>
  error instanceof Error ? error.message : 'No se pudo completar la operación.';

export function useConsulta<T>(consultar: (signal: AbortSignal) => Promise<T>) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      setCargando(true);
      setError(null);
      consultar(controller.signal)
        .then((v) => {
          if (!controller.signal.aborted) setDatos(v);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(mensaje(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setCargando(false);
        });
      return () => controller.abort();
    }, [consultar, version]),
  );
  const refrescar = useCallback(() => setVersion((v) => v + 1), []);
  return { datos, cargando, error, refrescar };
}

export function useAccion() {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bloqueo = useRef(false);
  const ejecutar = async (accion: () => Promise<void>) => {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setError(null);
    try {
      await accion();
    } catch (e) {
      setError(mensaje(e));
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  };
  return { ocupado, error, ejecutar };
}
