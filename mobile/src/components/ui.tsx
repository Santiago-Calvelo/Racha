import type { PropsWithChildren, ComponentProps } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { DesafioListado, Metricas as TipoMetricas } from '../api/tipos';

export const color = {
  fondo: '#FAF7F3',
  tarjeta: '#FFFFFF',
  principal: '#C65D3B',
  boton: '#A9472B',
  texto: '#29221F',
  secundario: '#6F625B',
  borde: '#E7DDD5',
  suave: '#F4E1D7',
  peligro: '#B42318',
};
export const estilos = StyleSheet.create({
  titulo: {
    color: color.texto,
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  subtitulo: { color: color.texto, fontSize: 19, fontWeight: '600' },
  texto: { color: color.secundario, fontSize: 15, lineHeight: 23 },
  etiqueta: { color: color.texto, fontSize: 14, fontWeight: '600' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tarjeta: {
    backgroundColor: color.tarjeta,
    borderRadius: 20,
    padding: 20,
    borderColor: color.borde,
    borderWidth: 1,
    gap: 12,
  },
  campo: {
    color: color.texto,
    borderWidth: 1,
    borderColor: color.borde,
    backgroundColor: color.tarjeta,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
});

export function Pantalla({
  children,
  refrescar,
  cargando = false,
}: PropsWithChildren<{ refrescar?: () => void; cargando?: boolean }>) {
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: color.fondo }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 48,
          gap: 20,
          flexGrow: 1,
        }}
        refreshControl={
          refrescar ? (
            <RefreshControl
              refreshing={cargando}
              onRefresh={refrescar}
              tintColor={color.boton}
              colors={[color.boton]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Cabecera({
  titulo,
  ayuda,
  volver = false,
}: {
  titulo: string;
  ayuda?: string;
  volver?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      {volver && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/')
          }
          style={{ minHeight: 48, justifyContent: 'center' }}
        >
          <Ionicons name="arrow-back" size={24} color={color.texto} />
        </Pressable>
      )}
      <Text
        style={{
          color: color.principal,
          fontSize: 12,
          letterSpacing: 3,
          fontWeight: '700',
          marginBottom: 4,
        }}
      >
        RACHA
      </Text>
      <Text accessibilityRole="header" style={estilos.titulo}>
        {titulo}
      </Text>
      {ayuda && <Text style={estilos.texto}>{ayuda}</Text>}
    </View>
  );
}
export function Boton({
  titulo,
  onPress,
  ocupado = false,
  disabled = false,
  secundario = false,
  peligro = false,
}: {
  titulo: string;
  onPress: () => void;
  ocupado?: boolean;
  disabled?: boolean;
  secundario?: boolean;
  peligro?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || ocupado, busy: ocupado }}
      disabled={disabled || ocupado}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 50,
        padding: 14,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: peligro
          ? color.peligro
          : secundario
            ? color.borde
            : color.boton,
        backgroundColor: secundario || peligro ? color.tarjeta : color.boton,
        opacity: disabled || ocupado ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      {ocupado ? (
        <ActivityIndicator
          color={secundario || peligro ? color.boton : '#FFFFFF'}
        />
      ) : (
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: peligro
              ? color.peligro
              : secundario
                ? color.texto
                : '#FFFFFF',
          }}
        >
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}
export function ErrorTexto({ texto }: { texto: string | null }) {
  return texto ? (
    <Text
      accessibilityRole="alert"
      style={{ color: color.peligro, fontSize: 15, lineHeight: 22 }}
    >
      {texto}
    </Text>
  ) : null;
}
export function Estado({
  cargando,
  error,
  vacio,
  reintentar,
}: {
  cargando: boolean;
  error: string | null;
  vacio?: string;
  reintentar: () => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      {cargando && (
        <ActivityIndicator color={color.boton} accessibilityLabel="Cargando" />
      )}
      <ErrorTexto texto={error} />
      {error && (
        <Boton
          titulo="Reintentar"
          secundario
          onPress={reintentar}
          disabled={cargando}
        />
      )}
      {!cargando && !error && vacio && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.texto}>{vacio}</Text>
        </View>
      )}
    </View>
  );
}
export function Campo({
  etiqueta,
  error,
  ...props
}: ComponentProps<typeof TextInput> & { etiqueta: string; error?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor="#92847A"
        style={[
          estilos.campo,
          props.multiline && { minHeight: 110, textAlignVertical: 'top' },
        ]}
        {...props}
      />
      <ErrorTexto texto={error ?? null} />
    </View>
  );
}
export function Opciones<T extends string>({
  valores,
  valor,
  cambiar,
  disabled = false,
}: {
  valores: readonly T[];
  valor: T;
  cambiar: (valor: T) => void;
  disabled?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
      style={{ flexGrow: 0 }}
    >
      {valores.map((v) => (
        <Pressable
          key={v}
          accessibilityRole="button"
          accessibilityState={{ selected: v === valor, disabled }}
          disabled={disabled}
          onPress={() => cambiar(v)}
          style={{
            minHeight: 48,
            justifyContent: 'center',
            paddingHorizontal: 16,
            borderRadius: 24,
            backgroundColor: v === valor ? color.boton : color.tarjeta,
            borderColor: color.borde,
            borderWidth: 1,
          }}
        >
          <Text
            style={{
              color: v === valor ? '#FFFFFF' : color.texto,
              fontSize: 13,
              fontWeight: '600',
            }}
          >
            {etiquetaCategoria(v)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export const etiquetaCategoria = (v: string) =>
  ({
    SALUD: 'Salud',
    ESTUDIO: 'Estudio',
    FINANZAS: 'Finanzas',
    BIENESTAR: 'Bienestar',
    OTRO: 'Otro',
    ACTIVO: 'Activo',
    PROGRAMADO: 'Programado',
    FINALIZADO: 'Finalizado',
    CANCELADO: 'Cancelado',
  })[v] ?? v;
export const fecha = (dia: string) => dia.split('-').reverse().join('/');
const iconos = {
  SALUD: 'footsteps-outline',
  ESTUDIO: 'book-outline',
  FINANZAS: 'wallet-outline',
  BIENESTAR: 'sunny-outline',
  OTRO: 'flag-outline',
} as const;
export function TarjetaDesafio({
  desafio,
  children,
  abrir = true,
}: PropsWithChildren<{ desafio: DesafioListado; abrir?: boolean }>) {
  return (
    <View style={estilos.tarjeta}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver ${desafio.nombre}`}
        disabled={!abrir}
        onPress={() =>
          router.push({ pathname: '/desafio/[id]', params: { id: desafio.id } })
        }
        style={estilos.fila}
      >
        <View
          style={{
            borderRadius: 14,
            padding: 12,
            backgroundColor: color.suave,
          }}
        >
          <Ionicons
            name={iconos[desafio.categoria]}
            size={23}
            color={color.boton}
          />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={estilos.subtitulo}>{desafio.nombre}</Text>
          <Text style={estilos.texto}>
            {etiquetaCategoria(desafio.categoria)} ·{' '}
            {etiquetaCategoria(desafio.estado)}
          </Text>
        </View>
        {abrir && (
          <Ionicons name="chevron-forward" size={18} color={color.secundario} />
        )}
      </Pressable>
      <Text style={estilos.texto}>
        {fecha(desafio.fechaInicio)} — {fecha(desafio.fechaFin)}
      </Text>
      {children}
    </View>
  );
}
export function Metricas({ datos }: { datos: TipoMetricas }) {
  return (
    <View
      style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}
    >
      {[
        [datos.rachaActual, 'Racha actual'],
        [datos.mejorRacha, 'Mejor racha'],
        [datos.puntos, 'Puntos'],
      ].map(([numero, etiqueta]) => (
        <View key={etiqueta} style={{ alignItems: 'center', flex: 1, gap: 4 }}>
          <Text style={[estilos.titulo, { fontSize: 23 }]}>{numero}</Text>
          <Text style={[estilos.texto, { fontSize: 12 }]}>{etiqueta}</Text>
        </View>
      ))}
    </View>
  );
}
export function confirmar(titulo: string, texto: string, accion: () => void) {
  Alert.alert(titulo, texto, [
    { text: 'Volver', style: 'cancel' },
    { text: 'Confirmar', style: 'destructive', onPress: accion },
  ]);
}
