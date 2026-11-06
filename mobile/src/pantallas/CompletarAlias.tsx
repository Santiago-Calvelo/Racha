import { useState } from 'react';
import { elegirAlias } from '../api/personas';
import { useSesion } from '../sesion';
import { useAccion } from '../hooks/useConsulta';
import { Boton, Cabecera, Campo, ErrorTexto, Pantalla } from '../components/ui';
export default function CompletarAlias() {
  const [alias, setAlias] = useState('');
  const [error, setError] = useState('');
  const sesion = useSesion();
  const accion = useAccion();
  return <Pantalla>
    <Cabecera titulo="Elegí tu alias" ayuda="Es único y te identifica en el ranking." />
    <Campo etiqueta="Alias" value={alias} onChangeText={setAlias} autoCapitalize="none" editable={!accion.ocupado} />
    <ErrorTexto texto={error || accion.error} />
    <Boton titulo="Guardar alias" ocupado={accion.ocupado} onPress={() => {
      const valor = alias.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(valor)) { setError('Usá entre 3 y 20 letras, números o guion bajo.'); return; }
      setError('');
      void accion.ejecutar(async () => sesion.actualizar(await elegirAlias(valor)));
    }} />
    <Boton titulo="Cerrar sesión" secundario disabled={accion.ocupado} onPress={() => void accion.ejecutar(sesion.salir)} />
  </Pantalla>;
}
