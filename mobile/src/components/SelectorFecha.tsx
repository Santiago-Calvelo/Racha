import DateTimePicker from '@react-native-community/datetimepicker';

export interface SelectorFechaProps {
  valor: string;
  cambiar: (valor: string) => void;
  cerrar: () => void;
}
export default function SelectorFecha({ valor, cambiar, cerrar }: SelectorFechaProps) {
  return <DateTimePicker value={new Date(`${valor}T12:00:00`)} mode="date"
    onChange={(evento, fecha) => {
      cerrar();
      if (evento.type === 'set' && fecha) cambiar(new Intl.DateTimeFormat('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(fecha));
    }} />;
}
