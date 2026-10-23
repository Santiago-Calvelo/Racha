import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { unirseADesafio } from '../api/participaciones';
import { useAccion } from '../hooks/useConsulta';
import { Boton, Cabecera, Campo, ErrorTexto, Pantalla } from '../components/ui';

export default function Unirse() {
  const params = useLocalSearchParams<{ codigo?: string }>();
  const [codigo, setCodigo] = useState(params.codigo ?? '');
  const [error, setError] = useState('');
  const accion = useAccion();
  return (
    <Pantalla>
      <Cabecera
        titulo="Unirse a un desafío"
        ayuda="Ingresá el código de invitación que te compartieron."
        volver
      />
      <Campo
        etiqueta="Código de invitación"
        value={codigo}
        onChangeText={(v) => setCodigo(v.toUpperCase().trim())}
        autoCapitalize="characters"
        maxLength={6}
        error={error}
        editable={!accion.ocupado}
      />
      <ErrorTexto texto={accion.error} />
      <Boton
        titulo="Unirse"
        ocupado={accion.ocupado}
        onPress={() => {
          if (!/^[A-Z0-9]{6}$/.test(codigo)) {
            setError('El código debe tener seis letras o números.');
            return;
          }
          setError('');
          void accion.ejecutar(async () => {
            const p = await unirseADesafio(codigo);
            router.replace({
              pathname: '/desafio/[id]',
              params: { id: p.desafio },
            });
          });
        }}
      />
    </Pantalla>
  );
}
