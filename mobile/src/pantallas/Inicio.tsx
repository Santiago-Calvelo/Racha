import { useCallback } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { obtenerInicio } from '../api/estadisticas';
import { useSesion } from '../sesion';
import { useConsulta } from '../hooks/useConsulta';
import {
  Boton,
  Cabecera,
  Estado,
  Metricas,
  Pantalla,
  TarjetaDesafio,
  estilos,
} from '../components/ui';

export default function Inicio() {
  const { persona } = useSesion();
  const id = persona?.id ?? '';
  const consulta = useConsulta(
    useCallback((s: AbortSignal) => obtenerInicio(id, s), [id]),
  );
  return (
    <Pantalla refrescar={consulta.refrescar} cargando={consulta.cargando}>
      <Cabecera
        titulo={`Hola, ${persona?.nombre.split(' ')[0] ?? ''}`}
        ayuda="Cada día cuenta. Seguí construyendo tu racha."
      />
      <Text style={estilos.subtitulo}>Mis desafíos vigentes</Text>
      <Estado
        cargando={consulta.cargando}
        error={consulta.error}
        vacio={
          consulta.datos && !consulta.datos.desafios.length
            ? 'Todavía no tenés desafíos vigentes. Encontrá tu próximo hábito.'
            : undefined
        }
        reintentar={consulta.refrescar}
      />
      {consulta.datos?.desafios.map(({ desafio, progreso }) => (
        <TarjetaDesafio key={desafio.id} desafio={desafio}>
          <Metricas datos={progreso} />
          <Text style={estilos.texto}>
            Posición:{' '}
            {progreso.posicion ? `#${progreso.posicion}` : 'Sin posición'}
          </Text>
          <Boton
            titulo={
              progreso.hizoCheckinHoy
                ? '✓ Check-in de hoy realizado'
                : desafio.estado === 'PROGRAMADO'
                  ? 'El desafío todavía no comenzó'
                  : 'Hacer check-in de hoy'
            }
            disabled={!progreso.puedeHacerCheckinHoy}
            onPress={() =>
              router.push({
                pathname: '/checkin/[id]',
                params: { id: desafio.id },
              })
            }
          />
        </TarjetaDesafio>
      ))}
      {!consulta.cargando && !consulta.datos?.desafios.length && (
        <Boton
          titulo="Explorar desafíos"
          onPress={() => router.push('/(tabs)/explorar')}
        />
      )}
    </Pantalla>
  );
}
