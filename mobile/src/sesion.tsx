import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { configurarAutenticacion, SesionVencida } from './api/cliente';
import { obtenerMe } from './api/personas';
import { borrarCredenciales, cerrarSesion, haySesion, ingresarGoogle, obtenerToken } from './auth/credenciales';
import type { Persona } from './api/tipos';
import { mensaje } from './hooks/useConsulta';

interface Sesion {
  persona: Persona | null;
  cargando: boolean;
  error: string | null;
  ingresar: () => Promise<void>;
  salir: () => Promise<void>;
  invalidar: () => Promise<void>;
  reintentar: () => void;
  actualizar: (persona: Persona) => void;
}
const Contexto = createContext<Sesion | null>(null);
export function SesionProvider({ children }: PropsWithChildren) {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    configurarAutenticacion(obtenerToken, async () => {
      try { await borrarCredenciales(); }
      finally { setPersona(null); setCargando(false); setError(null); }
    });
    setCargando(true);
    setError(null);
    (async () => {
      if (await haySesion()) {
        const p = await obtenerMe(controller.signal);
        if (!controller.signal.aborted) setPersona(p);
      }
    })().catch(e => { if (!controller.signal.aborted && !(e instanceof SesionVencida)) setError(mensaje(e)); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [version]);
  const ingresar = async () => {
    await ingresarGoogle();
    setPersona(await obtenerMe());
  };
  const salir = async () => {
    try { await cerrarSesion(); }
    finally { setPersona(null); setError(null); setCargando(false); }
  };
  const invalidar = async () => {
    try { await borrarCredenciales(); }
    finally { setPersona(null); setError(null); setCargando(false); }
  };
  return <Contexto.Provider value={{ persona, cargando, error, ingresar, salir, invalidar,
    reintentar: () => setVersion(v => v + 1), actualizar: setPersona }}>{children}</Contexto.Provider>;
}
export function useSesion() {
  const sesion = useContext(Contexto);
  if (!sesion) throw new Error('La sesión debe usarse dentro del proveedor');
  return sesion;
}
