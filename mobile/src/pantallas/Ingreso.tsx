import { Text } from 'react-native';
import { useSesion } from '../sesion';
import { useAccion } from '../hooks/useConsulta';
import { Boton, Cabecera, ErrorTexto, Pantalla, estilos } from '../components/ui';
export default function Ingreso() {
  const sesion = useSesion();
  const accion = useAccion();
  return <Pantalla>
    <Cabecera titulo="Ingresá a Racha" ayuda="Usá tu cuenta de Google para continuar." volver />
    <Text style={estilos.texto}>Al ingresar por primera vez vas a elegir tu alias único.</Text>
    <ErrorTexto texto={accion.error} />
    <Boton titulo="Continuar con Google" ocupado={accion.ocupado}
      onPress={() => void accion.ejecutar(sesion.ingresar)} />
  </Pantalla>;
}
