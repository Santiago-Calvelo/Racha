import type { SelectorFechaProps } from './SelectorFecha';

export default function SelectorFecha({ valor, cambiar, cerrar }: SelectorFechaProps) {
  return <input type="date" aria-label="Fecha de inicio" value={valor}
    style={{ padding: 12, fontSize: 16, border: '1px solid #E7DDD5', borderRadius: 8 }}
    onChange={evento => {
      if (evento.currentTarget.value) cambiar(evento.currentTarget.value);
    }} onBlur={cerrar} />;
}
