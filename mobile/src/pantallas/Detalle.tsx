import { useCallback, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { obtenerDesafio, cancelarDesafio } from '../api/desafios';
import { obtenerProgreso, obtenerRanking } from '../api/estadisticas';
import { listarParticipantes, abandonarDesafio } from '../api/participaciones';
import { listarCheckinsPorPersona, deshacerCheckin } from '../api/checkins';
import { ErrorApi } from '../api/cliente';
import type { DesafioListado } from '../api/tipos';
import { useSesion } from '../sesion';
import { useAccion, useConsulta } from '../hooks/useConsulta';
import { usePagina } from '../hooks/usePagina';
import { emojisAliento, useTiempoReal } from '../hooks/useTiempoReal';
import {
  Boton,
  Cabecera,
  ErrorTexto,
  Estado,
  Metricas,
  Opciones,
  Pantalla,
  TarjetaDesafio,
  color,
  confirmar,
  estilos,
  fecha,
} from '../components/ui';

function Resumen({
  desafio,
  refrescar,
}: {
  desafio: DesafioListado;
  refrescar: () => void;
}) {
  const { persona } = useSesion();
  const id = persona?.id ?? '';
  const consulta = useConsulta(
    useCallback(
      async (s: AbortSignal) => {
        try {
          return await obtenerProgreso(desafio.id, id, s);
        } catch (e) {
          if (e instanceof ErrorApi && e.status === 404) return null;
          throw e;
        }
      },
      [desafio.id, id],
    ),
  );
  const accion = useAccion();
  const p = consulta.datos;
  const realizar = (operacion: () => Promise<unknown>) =>
    void accion.ejecutar(async () => {
      await operacion();
      consulta.refrescar();
      refrescar();
    });
  return (
    <>
      <Estado
        cargando={consulta.cargando}
        error={consulta.error}
        reintentar={consulta.refrescar}
      />
      {p && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.subtitulo}>Tu progreso</Text>
          <Metricas datos={p} />
          <Text style={estilos.texto}>
            {p.diasCumplidos} días cumplidos ·{' '}
            {p.posicion ? `Puesto #${p.posicion}` : 'Sin posición'}
          </Text>
          <Boton
            titulo={
              p.hizoCheckinHoy
                ? '✓ Check-in de hoy realizado'
                : 'Hacer check-in de hoy'
            }
            disabled={!p.puedeHacerCheckinHoy || accion.ocupado}
            onPress={() =>
              router.push({
                pathname: '/checkin/[id]',
                params: { id: desafio.id },
              })
            }
          />
          {p.participacion === 'ACTIVA' && desafio.estado !== 'CANCELADO' && (
            <Boton
              titulo="Registrar el de ayer"
              secundario
              disabled={accion.ocupado}
              onPress={() =>
                router.push({
                  pathname: '/checkin/[id]',
                  params: { id: desafio.id, dia: 'ayer' },
                })
              }
            />
          )}
          {p.puedeDeshacerCheckin && (
            <Boton
              titulo="Deshacer check-in de hoy"
              secundario
              ocupado={accion.ocupado}
              onPress={() =>
                confirmar(
                  'Deshacer check-in',
                  'Se eliminarán el registro de hoy y sus puntos.',
                  () => realizar(() => deshacerCheckin(desafio.id)),
                )
              }
            />
          )}
        </View>
      )}
      {!consulta.cargando && !consulta.error && !p && (
        <Boton
          titulo="Unirme con el código"
          disabled={!['ACTIVO', 'PROGRAMADO'].includes(desafio.estado)}
          onPress={() =>
            router.push({
              pathname: '/unirse',
              params: { codigo: desafio.codigoInvitacion },
            })
          }
        />
      )}
      {p?.participacion === 'ABANDONADA' && (
        <Text style={estilos.texto}>
          Abandonaste este desafío y no podés volver a unirte.
        </Text>
      )}
      {p?.participacion === 'ACTIVA' && desafio.creador !== id && (
        <Boton
          titulo="Abandonar desafío"
          peligro
          ocupado={accion.ocupado}
          onPress={() =>
            confirmar(
              'Abandonar desafío',
              'No podrás volver a unirte y dejarás de aparecer en el ranking.',
              () => realizar(() => abandonarDesafio(desafio.id)),
            )
          }
        />
      )}
      {desafio.creador === id &&
        ['ACTIVO', 'PROGRAMADO'].includes(desafio.estado) && (
          <Boton
            titulo="Cancelar desafío"
            peligro
            ocupado={accion.ocupado}
            onPress={() =>
              confirmar(
                'Cancelar desafío',
                'El desafío quedará cancelado para todos sus participantes.',
                () => realizar(() => cancelarDesafio(desafio.id)),
              )
            }
          />
        )}
      <ErrorTexto texto={accion.error} />
    </>
  );
}
function Participantes({ id, alentar, conectado }: { id: string; alentar: (destinatario: string, emoji: string) => Promise<void>; conectado: boolean }) {
  const { persona } = useSesion();
  const accion = useAccion();
  const consulta = useConsulta(
    useCallback((s: AbortSignal) => listarParticipantes(id, s), [id]),
  );
  return (
    <>
      <Estado
        cargando={consulta.cargando}
        error={consulta.error}
        vacio={
          !consulta.datos?.length ? 'No hay participantes activos.' : undefined
        }
        reintentar={consulta.refrescar}
      />
      {consulta.datos && (
        <Text style={estilos.texto}>
          {consulta.datos.length} participantes activos
        </Text>
      )}
      {consulta.datos?.map((p) => (
        <View key={p.id} style={estilos.tarjeta}>
          <Text style={estilos.subtitulo}>
            {p.persona?.nombre ?? 'Perfil eliminado'}
          </Text>
          <Text style={estilos.texto}>
            {p.persona ? `@${p.persona.alias}` : ''}
          </Text>
          {p.persona && p.persona.id !== persona?.id && conectado && (
            <View style={{ gap: 8 }}>
              <Text style={estilos.etiqueta}>Enviar aliento</Text>
              {emojisAliento.map(emoji => <Boton key={emoji} titulo={emoji} secundario
                ocupado={accion.ocupado} onPress={() => void accion.ejecutar(() => alentar(p.persona!.id, emoji))} />)}
            </View>
          )}
        </View>
      ))}
      <ErrorTexto texto={accion.error} />
    </>
  );
}
function Ranking({ id }: { id: string }) {
  const { persona } = useSesion();
  const consulta = useConsulta(
    useCallback((s: AbortSignal) => obtenerRanking(id, s), [id]),
  );
  return (
    <>
      <Estado
        cargando={consulta.cargando}
        error={consulta.error}
        vacio={
          !consulta.datos?.participantes.length
            ? 'No hay participantes en el ranking.'
            : undefined
        }
        reintentar={consulta.refrescar}
      />
      {consulta.datos?.ganador && (
        <Text style={estilos.subtitulo}>
          Ganador: {consulta.datos.ganador.persona.nombre}
        </Text>
      )}
      {consulta.datos?.participantes.map((p) => (
        <View
          key={p.persona.id}
          style={[
            estilos.tarjeta,
            {
              backgroundColor:
                p.persona.id === persona?.id ? color.suave : color.tarjeta,
            },
          ]}
        >
          <View style={estilos.fila}>
            <Text style={estilos.subtitulo}>#{p.posicion}</Text>
            <View style={{ flex: 1 }}>
              <Text style={estilos.etiqueta}>{p.persona.nombre}</Text>
              <Text style={estilos.texto}>@{p.persona.alias}</Text>
            </View>
            <Text style={estilos.subtitulo}>{p.puntos} pts</Text>
          </View>
          <Text style={estilos.texto}>
            Racha actual: {p.rachaActual} · Mejor racha: {p.mejorRacha}
          </Text>
        </View>
      ))}
    </>
  );
}
function Historial({ id }: { id: string }) {
  const { persona } = useSesion();
  const personaId = persona?.id ?? '';
  const consulta = usePagina(
    useCallback(
      (pagina: number, s: AbortSignal) =>
        listarCheckinsPorPersona(id, personaId, pagina, s),
      [id, personaId],
    ),
  );
  return (
    <>
      <Estado
        cargando={consulta.cargando}
        error={consulta.error}
        vacio={
          !consulta.items.length
            ? 'Todavía no registraste check-ins en este desafío.'
            : undefined
        }
        reintentar={consulta.refrescar}
      />
      {consulta.items.map((r) => (
        <View key={r.id} style={estilos.tarjeta}>
          <View style={estilos.fila}>
            <Text style={[estilos.etiqueta, { flex: 1 }]}>{fecha(r.dia)}</Text>
            <Text style={estilos.subtitulo}>+{r.puntos} pts</Text>
          </View>
          {r.valor !== undefined && (
            <Text style={estilos.texto}>Valor: {r.valor}</Text>
          )}
          {r.nota && <Text style={estilos.texto}>{r.nota}</Text>}
        </View>
      ))}
      {consulta.hayMas && (
        <Boton
          titulo="Cargar más"
          secundario
          ocupado={consulta.cargando}
          onPress={consulta.mas}
        />
      )}
    </>
  );
}
export default function Detalle() {
  const sesion = useSesion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState('Resumen');
  const [revision, setRevision] = useState(0);
  const consulta = useConsulta(
    useCallback((s: AbortSignal) => obtenerDesafio(id, s), [id]),
  );
  const accion = useAccion();
  const refrescarConsulta = consulta.refrescar;
  const refrescar = useCallback(() => {
    refrescarConsulta();
    setRevision((v) => v + 1);
  }, [refrescarConsulta]);
  const tiempo = useTiempoReal(id, sesion.persona?.id ?? '', refrescar, sesion.invalidar);
  return (
    <Pantalla refrescar={refrescar} cargando={consulta.cargando}>
      <Cabecera titulo="Tu desafío" volver />
      {tiempo.aviso && <Text accessibilityLiveRegion="polite" style={estilos.etiqueta}>{tiempo.aviso}</Text>}
      {tiempo.error && <>
        <ErrorTexto texto={tiempo.error} />
        <Boton titulo="Reconectar" secundario onPress={tiempo.reintentar} />
      </>}
      <Estado
        cargando={consulta.cargando}
        error={consulta.error}
        reintentar={consulta.refrescar}
      />
      {consulta.datos && (
        <>
          <TarjetaDesafio desafio={consulta.datos} abrir={false}>
            {consulta.datos.descripcion && (
              <Text style={estilos.texto}>{consulta.datos.descripcion}</Text>
            )}
            <Text style={estilos.texto}>
              Cupo máximo: {consulta.datos.maximoParticipantes}
            </Text>
            <Text selectable style={estilos.subtitulo}>
              Código: {consulta.datos.codigoInvitacion}
            </Text>
            <Boton
              titulo="Compartir código"
              secundario
              ocupado={accion.ocupado}
              onPress={() =>
                void accion.ejecutar(async () => {
                  await Share.share({
                    message: `Sumate a ${consulta.datos?.nombre}. Código: ${consulta.datos?.codigoInvitacion}`,
                  });
                })
              }
            />
          </TarjetaDesafio>
          <ErrorTexto texto={accion.error} />
          <Opciones
            valores={['Resumen', 'Participantes', 'Ranking', 'Historial']}
            valor={tab}
            cambiar={setTab}
          />
          <View key={revision} style={{ gap: 20 }}>
            {tab === 'Resumen' && (
              <Resumen desafio={consulta.datos} refrescar={refrescar} />
            )}
            {tab === 'Participantes' && <Participantes id={id} alentar={tiempo.alentar} conectado={tiempo.conectado} />}
            {tab === 'Ranking' && <Ranking id={id} />}
            {tab === 'Historial' && <Historial id={id} />}
          </View>
        </>
      )}
    </Pantalla>
  );
}
