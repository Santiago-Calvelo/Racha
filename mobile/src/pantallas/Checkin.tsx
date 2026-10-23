import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { registrarCheckin } from '../api/checkins';
import { useAccion } from '../hooks/useConsulta';
import {
  Boton,
  Cabecera,
  Campo,
  ErrorTexto,
  Opciones,
  Pantalla,
  estilos,
} from '../components/ui';

export default function Checkin() {
  const { id, dia: inicial } = useLocalSearchParams<{
    id: string;
    dia?: string;
  }>();
  const [dia, setDia] = useState(inicial === 'ayer' ? 'ayer' : 'hoy');
  const [nota, setNota] = useState('');
  const [valor, setValor] = useState('');
  const [error, setError] = useState('');
  const accion = useAccion();
  return (
    <Pantalla>
      <Cabecera
        titulo="Hacer check-in"
        ayuda="Un paso más en tu desafío."
        volver
      />
      <Opciones
        valores={['hoy', 'ayer']}
        valor={dia}
        cambiar={setDia}
        disabled={accion.ocupado}
      />
      <Campo
        etiqueta="Nota (opcional)"
        placeholder="¿Cómo te fue?"
        value={nota}
        onChangeText={setNota}
        multiline
        maxLength={140}
        editable={!accion.ocupado}
      />
      <Text style={[estilos.texto, { textAlign: 'right' }]}>
        {nota.length}/140
      </Text>
      <Campo
        etiqueta="Valor (opcional)"
        placeholder="Ej. 30"
        value={valor}
        onChangeText={setValor}
        keyboardType="decimal-pad"
        editable={!accion.ocupado}
      />
      <Text style={estilos.texto}>
        El valor se guarda en tu historial. Los puntos se calculan por tu racha.
      </Text>
      <ErrorTexto texto={error || accion.error} />
      <Boton
        titulo="Guardar check-in"
        ocupado={accion.ocupado}
        onPress={() => {
          const numero = Number(valor.replace(',', '.'));
          if (valor.trim() && (!Number.isFinite(numero) || numero < 0)) {
            setError('El valor debe ser un número no negativo.');
            return;
          }
          setError('');
          void accion.ejecutar(async () => {
            await registrarCheckin({
              desafio: id,
              dia: dia === 'ayer' ? 'ayer' : 'hoy',
              ...(nota.trim() ? { nota: nota.trim() } : {}),
              ...(valor.trim() ? { valor: numero } : {}),
            });
            router.back();
          });
        }}
      />
      <Boton
        titulo="Cancelar"
        secundario
        disabled={accion.ocupado}
        onPress={() => router.back()}
      />
    </Pantalla>
  );
}
