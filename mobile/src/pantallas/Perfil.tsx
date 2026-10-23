import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { obtenerPersona } from '../api/personas';
import { useSesion } from '../sesion';
import { useAccion, useConsulta } from '../hooks/useConsulta';
import {
  Boton,
  Cabecera,
  ErrorTexto,
  Estado,
  Pantalla,
  estilos,
  color,
} from '../components/ui';

export default function Perfil() {
  const sesion = useSesion();
  const id = sesion.persona?.id ?? '';
  const consulta = useConsulta(
    useCallback((s: AbortSignal) => obtenerPersona(id, s), [id]),
  );
  const accion = useAccion();
  const p = consulta.datos;
  return (
    <Pantalla refrescar={consulta.refrescar} cargando={consulta.cargando}>
      <Cabecera titulo="Tu perfil" ayuda="Tu camino, a tu ritmo." />
      <Estado
        cargando={consulta.cargando}
        error={consulta.error}
        reintentar={consulta.refrescar}
      />
      {p && (
        <>
          <View style={estilos.tarjeta}>
            <View style={estilos.fila}>
              <View
                style={{
                  backgroundColor: color.suave,
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={[estilos.titulo, { color: color.boton }]}>
                  {p.nombre.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.subtitulo}>{p.nombre}</Text>
                <Text style={estilos.texto}>@{p.alias}</Text>
              </View>
            </View>
            <Text style={estilos.texto}>{p.email}</Text>
            <Text style={estilos.texto}>{p.zonaHoraria}</Text>
          </View>
          <Boton
            titulo="Editar nombre y zona horaria"
            secundario
            onPress={() => router.push('/editar-perfil')}
          />
          <Boton
            titulo="Mis desafíos finalizados"
            secundario
            onPress={() => router.push('/resultados')}
          />
        </>
      )}
      <ErrorTexto texto={accion.error} />
      <Boton
        titulo="Cambiar de perfil"
        secundario
        ocupado={accion.ocupado}
        onPress={() =>
          void accion.ejecutar(async () => {
            await sesion.salir();
          })
        }
      />
    </Pantalla>
  );
}
