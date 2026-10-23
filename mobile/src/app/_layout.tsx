import { Stack } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SesionProvider, useSesion } from '../sesion';
import { Boton, Cabecera, Estado, Pantalla, color } from '../components/ui';

function Navegacion() {
  const sesion = useSesion();
  if (sesion.cargando || sesion.error)
    return (
      <Pantalla>
        <Cabecera titulo="Tu próximo paso" ayuda="Recuperando tu perfil…" />
        <Estado
          cargando={sesion.cargando}
          error={sesion.error}
          reintentar={sesion.reintentar}
        />
        {sesion.error && (
          <Boton
            titulo="Elegir otro perfil"
            secundario
            onPress={() => void sesion.salir().catch(sesion.reintentar)}
          />
        )}
      </Pantalla>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.fondo },
      }}
    >
      <Stack.Protected guard={!sesion.persona}>
        <Stack.Screen name="bienvenida" />
        <Stack.Screen name="ingreso" />
      </Stack.Protected>
      <Stack.Protected guard={!!sesion.persona}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="desafio/[id]" />
        <Stack.Screen name="checkin/[id]" />
        <Stack.Screen name="unirse" />
        <Stack.Screen name="editar-perfil" />
        <Stack.Screen name="resultados" />
      </Stack.Protected>
    </Stack>
  );
}
export default function Layout() {
  return (
    <SesionProvider>
      <StatusBar style="dark" />
      <Navegacion />
    </SesionProvider>
  );
}
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Pantalla>
      <Cabecera
        titulo="No pudimos abrir esta pantalla"
        ayuda="Tus datos siguen guardados. Podés volver a intentarlo."
      />
      <Boton titulo="Reintentar" onPress={() => void retry()} />
    </Pantalla>
  );
}
