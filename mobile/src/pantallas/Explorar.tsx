import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { listarDesafios } from '../api/desafios';
import { usePagina } from '../hooks/usePagina';
import { categorias } from '../validaciones';
import {
  Boton,
  Cabecera,
  Estado,
  Opciones,
  Pantalla,
  TarjetaDesafio,
  estilos,
} from '../components/ui';

export default function Explorar() {
  const [categoria, setCategoria] = useState('Todos');
  const [estado, setEstado] = useState('Todos');
  const consulta = usePagina(
    useCallback(
      (pagina: number, s: AbortSignal) =>
        listarDesafios(
          {
            pagina,
            categoria: categoria === 'Todos' ? undefined : categoria,
            estado: estado === 'Todos' ? undefined : estado,
          },
          s,
        ),
      [categoria, estado],
    ),
  );
  return (
    <Pantalla refrescar={consulta.refrescar} cargando={consulta.cargando}>
      <Cabecera
        titulo="Explorar desafíos"
        ayuda="Un hábito nuevo empieza con un pequeño paso."
      />
      <Opciones
        valores={['Todos', ...categorias]}
        valor={categoria}
        cambiar={setCategoria}
      />
      <Opciones
        valores={['Todos', 'PROGRAMADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO']}
        valor={estado}
        cambiar={setEstado}
      />
      <Boton
        titulo="Tengo un código de invitación"
        secundario
        onPress={() => router.push('/unirse')}
      />
      <Estado
        cargando={consulta.cargando}
        error={consulta.error}
        vacio={
          !consulta.items.length
            ? 'No encontramos desafíos con estos filtros.'
            : undefined
        }
        reintentar={consulta.refrescar}
      />
      {consulta.items.map((d) => (
        <TarjetaDesafio key={d.id} desafio={d}>
          <Text style={estilos.texto}>
            {d.participantesActivos}/{d.maximoParticipantes} participantes
          </Text>
          {d.miParticipacion === 'ACTIVA' ? (
            <Text style={estilos.etiqueta}>Ya participás</Text>
          ) : (
            <Boton
              titulo={
                d.miParticipacion === 'ABANDONADA'
                  ? 'Ya abandonaste este desafío'
                  : d.participantesActivos >= d.maximoParticipantes
                    ? 'Cupo completo'
                    : 'Unirse'
              }
              disabled={
                d.miParticipacion === 'ABANDONADA' ||
                !['ACTIVO', 'PROGRAMADO'].includes(d.estado) ||
                d.participantesActivos >= d.maximoParticipantes
              }
              onPress={() =>
                router.push({
                  pathname: '/unirse',
                  params: { codigo: d.codigoInvitacion },
                })
              }
            />
          )}
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
