import { router } from 'expo-router';
import { Boton, Cabecera, Pantalla } from '../components/ui';

export default function NoEncontrada() {
  return (
    <Pantalla>
      <Cabecera
        titulo="Esta pantalla no está disponible"
        ayuda="Volvé al inicio para continuar."
      />
      <Boton titulo="Volver al inicio" onPress={() => router.replace('/')} />
    </Pantalla>
  );
}
