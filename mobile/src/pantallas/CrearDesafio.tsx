import { useState } from 'react';
import { Text, View } from 'react-native';
import SelectorFecha from '../components/SelectorFecha';
import { router } from 'expo-router';
import { crearDesafio } from '../api/desafios';
import type { CategoriaDesafio } from '../api/tipos';
import { useAccion } from '../hooks/useConsulta';
import { categorias, diaZona, moverDia, validarDesafio } from '../validaciones';
import {
  Boton,
  Cabecera,
  Campo,
  ErrorTexto,
  Opciones,
  Pantalla,
  estilos,
  fecha,
} from '../components/ui';

export default function CrearDesafio() {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<CategoriaDesafio>('SALUD');
  const [inicio, setInicio] = useState(
    diaZona('America/Argentina/Buenos_Aires'),
  );
  const [duracion, setDuracion] = useState('30');
  const [cupo, setCupo] = useState('10');
  const [calendario, setCalendario] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const accion = useAccion();
  const guardar = () => {
    const dias = Number(duracion);
    const datos = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      categoria,
      fechaInicio: inicio,
      fechaFin:
        Number.isInteger(dias) && dias >= 3 && dias <= 90
          ? moverDia(inicio, dias - 1)
          : inicio,
      ...(cupo.trim() ? { maximoParticipantes: Number(cupo) } : {}),
    };
    const fallos = validarDesafio(datos, dias);
    setErrores(fallos);
    if (Object.keys(fallos).length) return;
    void accion.ejecutar(async () => {
      const d = await crearDesafio(datos);
      setNombre('');
      setDescripcion('');
      router.push({ pathname: '/desafio/[id]', params: { id: d.id } });
    });
  };
  return (
    <Pantalla>
      <Cabecera
        titulo="Crear desafío"
        ayuda="Dale un nombre a ese hábito que querés construir."
      />
      <Campo
        etiqueta="Nombre del desafío"
        placeholder="Ej. Caminar cada día"
        value={nombre}
        onChangeText={setNombre}
        maxLength={60}
        error={errores.nombre}
        editable={!accion.ocupado}
      />
      <Text style={estilos.etiqueta}>Categoría</Text>
      <Opciones
        valores={categorias}
        valor={categoria}
        cambiar={setCategoria}
        disabled={accion.ocupado}
      />
      <Campo
        etiqueta="Descripción (opcional)"
        placeholder="Contá de qué se trata…"
        multiline
        value={descripcion}
        onChangeText={setDescripcion}
        maxLength={280}
        error={errores.descripcion}
        editable={!accion.ocupado}
      />
      <View style={{ gap: 8 }}>
        <Text style={estilos.etiqueta}>Fecha de inicio</Text>
        <Boton
          titulo={fecha(inicio)}
          secundario
          disabled={accion.ocupado}
          onPress={() => setCalendario(true)}
        />
        <Text style={estilos.texto}>Referencia: Buenos Aires (GMT-3).</Text>
        <ErrorTexto texto={errores.fechaInicio ?? null} />
      </View>
      {calendario && (
        <SelectorFecha valor={inicio} cambiar={setInicio} cerrar={() => setCalendario(false)} />
      )}
      <Campo
        etiqueta="Duración (3 a 90 días)"
        value={duracion}
        onChangeText={setDuracion}
        keyboardType="number-pad"
        error={errores.duracion}
        editable={!accion.ocupado}
      />
      <Campo
        etiqueta="Participantes máximos (2 a 20, por defecto 10)"
        value={cupo}
        onChangeText={setCupo}
        keyboardType="number-pad"
        error={errores.cupo}
        editable={!accion.ocupado}
      />
      <ErrorTexto texto={accion.error} />
      <Boton
        titulo="Crear desafío"
        ocupado={accion.ocupado}
        onPress={guardar}
      />
    </Pantalla>
  );
}
