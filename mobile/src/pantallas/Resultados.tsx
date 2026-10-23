import { useCallback } from 'react';
import { Text } from 'react-native';
import { obtenerResultados } from '../api/estadisticas';
import { useSesion } from '../sesion';
import { usePagina } from '../hooks/usePagina';
import {
  Boton,
  Cabecera,
  Estado,
  Metricas,
  Pantalla,
  TarjetaDesafio,
  estilos,
} from '../components/ui';

export default function Resultados() {
  const { persona } = useSesion();
  const id = persona?.id ?? '';
  const consulta = usePagina(
    useCallback(
      (pagina: number, s: AbortSignal) => obtenerResultados(id, pagina, s),
      [id],
    ),
  );
  return (
    <Pantalla refrescar={consulta.refrescar} cargando={consulta.cargando}>
      <Cabecera
        titulo="Desafíos finalizados"
        ayuda="Cada paso que diste también cuenta."
        volver
      />
      <Estado
        cargando={consulta.cargando}
        error={consulta.error}
        vacio={
          !consulta.items.length
            ? 'Tus desafíos finalizados aparecerán acá.'
            : undefined
        }
        reintentar={consulta.refrescar}
      />
      {consulta.items.map((r) => (
        <TarjetaDesafio key={r.desafio.id} desafio={r.desafio}>
          <Metricas datos={r.progreso} />
          <Text style={estilos.texto}>
            {r.progreso.posicion
              ? `Tu posición: #${r.progreso.posicion}`
              : 'Sin puesto: participación abandonada'}
          </Text>
          <Text style={estilos.texto}>
            {r.ganador ? `Ganador: ${r.ganador.persona.nombre}` : 'Sin ganador'}
          </Text>
        </TarjetaDesafio>
      ))}
      {consulta.hayMas && (
        <Boton
          titulo="Cargar más"
          secundario
          ocupado={consulta.cargando}
          onPress={consulta.mas}
        />
      )}
    </Pantalla>
  );
}
