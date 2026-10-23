import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ErrorApi,
  restablecerUsuarioInicial,
  seleccionarUsuario,
} from './api/cliente';
import { obtenerPersona } from './api/personas';
import type { Persona } from './api/tipos';
import { mensaje } from './hooks/useConsulta';

interface Sesion {
  persona: Persona | null;
  cargando: boolean;
  error: string | null;
  elegir: (persona: Persona) => Promise<void>;
  salir: () => Promise<void>;
  reintentar: () => void;
  actualizar: (persona: Persona) => void;
}
const Contexto = createContext<Sesion | null>(null);
const clave = 'racha.persona';

export function SesionProvider({ children }: PropsWithChildren) {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setCargando(true);
    setError(null);
    (async () => {
      const id = await AsyncStorage.getItem(clave);
      if (controller.signal.aborted) return;
      if (id) {
        seleccionarUsuario(id);
        try {
          const p = await obtenerPersona(id, controller.signal);
          if (!controller.signal.aborted) setPersona(p);
        } catch (e) {
          if (e instanceof ErrorApi && e.status === 404) {
            await AsyncStorage.removeItem(clave);
            restablecerUsuarioInicial();
          } else throw e;
        }
      } else restablecerUsuarioInicial();
    })()
      .catch((e) => {
        if (!controller.signal.aborted) setError(mensaje(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    return () => controller.abort();
  }, [version]);
  const elegir = async (p: Persona) => {
    await AsyncStorage.setItem(clave, p.id);
    seleccionarUsuario(p.id);
    setPersona(p);
  };
  const salir = async () => {
    await AsyncStorage.removeItem(clave);
    restablecerUsuarioInicial();
    setPersona(null);
    setError(null);
    setCargando(false);
  };
  return (
    <Contexto.Provider
      value={{
        persona,
        cargando,
        error,
        elegir,
        salir,
        reintentar: () => setVersion((v) => v + 1),
        actualizar: setPersona,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}
export function useSesion() {
  const sesion = useContext(Contexto);
  if (!sesion) throw new Error('La sesión debe usarse dentro del proveedor');
  return sesion;
}
