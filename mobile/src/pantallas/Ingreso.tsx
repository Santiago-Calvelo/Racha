import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { listarPersonas, crearPersona } from '../api/personas';
import { useSesion } from '../sesion';
import { useAccion, useConsulta } from '../hooks/useConsulta';
import {
  Boton,
  Cabecera,
  Campo,
  Estado,
  ErrorTexto,
  Opciones,
  Pantalla,
  estilos,
} from '../components/ui';
import { validarPerfil, zonas } from '../validaciones';

export default function Ingreso() {
  const { crear } = useLocalSearchParams<{ crear?: string }>();
  const [registro, setRegistro] = useState(crear === '1');
  const [nombre, setNombre] = useState('');
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [zona, setZona] = useState<string>(zonas[0]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const consulta = useConsulta(
    useCallback((s: AbortSignal) => listarPersonas(s), []),
  );
  const accion = useAccion();
  const sesion = useSesion();
  const guardar = () => {
    const datos = {
      nombre: nombre.trim(),
      alias: alias.trim(),
      email: email.trim(),
      zonaHoraria: zona.trim(),
    };
    const fallos = validarPerfil(datos);
    setErrores(fallos);
    if (Object.keys(fallos).length) return;
    void accion.ejecutar(async () => {
      const p = await crearPersona(datos);
      await sesion.elegir(p);
    });
  };
  return (
    <Pantalla
      refrescar={!registro ? consulta.refrescar : undefined}
      cargando={consulta.cargando && !registro}
    >
      <Cabecera
        titulo={registro ? 'Creá tu perfil' : 'Elegí tu perfil'}
        ayuda={
          registro
            ? 'Completá tus datos para empezar.'
            : 'Estas son las personas registradas. Elegí con quién continuar.'
        }
        volver
      />
      {registro ? (
        <>
          <Campo
            etiqueta="Nombre"
            value={nombre}
            onChangeText={setNombre}
            error={errores.nombre}
            editable={!accion.ocupado}
          />
          <Campo
            etiqueta="Alias"
            value={alias}
            onChangeText={setAlias}
            autoCapitalize="none"
            error={errores.alias}
            editable={!accion.ocupado}
          />
          <Campo
            etiqueta="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errores.email}
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
            titulo="Crear perfil"
            ocupado={accion.ocupado}
            onPress={guardar}
          />
          <Boton
            titulo="Ya tengo un perfil"
            secundario
            disabled={accion.ocupado}
            onPress={() => setRegistro(false)}
          />
        </>
      ) : (
        <>
          <Estado
            cargando={consulta.cargando}
            error={consulta.error}
            vacio={
              !consulta.datos?.length
                ? 'Todavía no hay perfiles. Creá el primero.'
                : undefined
            }
            reintentar={consulta.refrescar}
          />
          {consulta.datos?.map((p) => (
            <View key={p.id} style={estilos.tarjeta}>
              <Text style={estilos.subtitulo}>{p.nombre}</Text>
              <Text style={estilos.texto}>
                @{p.alias} · {p.zonaHoraria}
              </Text>
              <Boton
                titulo={`Continuar como ${p.nombre}`}
                disabled={accion.ocupado}
                onPress={() =>
                  void accion.ejecutar(async () => {
                    await sesion.elegir(p);
                  })
                }
              />
            </View>
          ))}
          <ErrorTexto texto={accion.error} />
          <Boton
            titulo="Agregar otra persona"
            secundario
            disabled={accion.ocupado}
            onPress={() => setRegistro(true)}
          />
        </>
      )}
    </Pantalla>
  );
}
