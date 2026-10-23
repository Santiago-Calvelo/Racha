import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { editarPersona } from '../api/personas';
import { useSesion } from '../sesion';
import { useAccion } from '../hooks/useConsulta';
import { validarPerfil, zonas } from '../validaciones';
import {
  Boton,
  Cabecera,
  Campo,
  ErrorTexto,
  Opciones,
  Pantalla,
  estilos,
} from '../components/ui';

export default function EditarPerfil() {
  const sesion = useSesion();
  const p = sesion.persona;
  const [nombre, setNombre] = useState(p?.nombre ?? '');
  const [zona, setZona] = useState(p?.zonaHoraria ?? zonas[0]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const accion = useAccion();
  return (
    <Pantalla>
      <Cabecera
        titulo="Editar perfil"
        ayuda="Los cambios se guardarán en tu perfil."
        volver
      />
      <Campo
        etiqueta="Nombre"
        value={nombre}
        onChangeText={setNombre}
        error={errores.nombre}
        editable={!accion.ocupado}
      />
      <Text style={estilos.etiqueta}>Zona horaria</Text>
      <Opciones
        valores={zonas}
        valor={zona}
        cambiar={setZona}
        disabled={accion.ocupado}
      />
      <Campo
        etiqueta="Zona IANA"
        value={zona}
        onChangeText={setZona}
        autoCapitalize="none"
        error={errores.zonaHoraria}
        editable={!accion.ocupado}
      />
      <ErrorTexto texto={accion.error} />
      <Boton
        titulo="Guardar cambios"
        ocupado={accion.ocupado}
        onPress={() => {
          if (!p) return;
          const fallos = validarPerfil({ ...p, nombre, zonaHoraria: zona });
          setErrores(fallos);
          if (Object.keys(fallos).length) return;
          void accion.ejecutar(async () => {
            const actualizada = await editarPersona(p.id, {
              nombre: nombre.trim(),
              zonaHoraria: zona.trim(),
            });
            sesion.actualizar(actualizada);
            router.back();
          });
        }}
      />
    </Pantalla>
  );
}
