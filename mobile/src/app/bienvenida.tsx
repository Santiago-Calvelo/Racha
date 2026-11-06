import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Boton, Cabecera, Pantalla, color, estilos } from '../components/ui';

export default function Bienvenida() {
  return (
    <Pantalla>
      <View style={{ flex: 1, justifyContent: 'center', gap: 32 }}>
        <View
          style={{
            alignSelf: 'center',
            padding: 40,
            borderRadius: 100,
            backgroundColor: color.suave,
          }}
        >
          <Ionicons name="trail-sign-outline" size={80} color={color.boton} />
        </View>
        <Cabecera
          titulo={'Pequeños pasos.\nGrandes desafíos.'}
          ayuda="Hábitos en compañía. Más motivación, mejores resultados."
        />
        <View style={{ gap: 12 }}>
          <Boton
            titulo="Continuar con Google"
            onPress={() =>
              router.push('/ingreso')
            }
          />
        </View>
        <Text style={[estilos.texto, { textAlign: 'center' }]}>
          Un día más, un paso más.
        </Text>
      </View>
    </Pantalla>
  );
}
