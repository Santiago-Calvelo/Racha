# Compatibilidad — estado de entrega

**Parte IV no realizada**, por decisión del autor. Este archivo conserva el lugar
exigido en la estructura; no acredita cambios compatibles ni pruebas de migración.
La API actual no implementa versionado mínimo/recomendado ni sunset.

Se reproduce la matriz del Anexo A como referencia de lo que queda fuera del alcance.
No se completan respuestas sí/no que no se analizaron ni verificaron para Parte IV.

| Cambio | ¿La app vieja sigue andando con el back nuevo? | ¿La app nueva sigue andando con el back viejo? | Cómo se resuelve sin romper |
| --- | --- | --- | --- |
| Renombrar `fechaFin` por `finalizaEn` | No evaluado | No evaluado | Fuera de alcance; cambio no implementado |
| Cambiar `puntos` de número a objeto | No evaluado | No evaluado | Fuera de alcance; cambio no implementado |
| Agregar el estado `PAUSADO` | No evaluado | No evaluado | Fuera de alcance; cambio no implementado |
| Campo `zonaHoraria` obligatorio en el check-in | No evaluado | No evaluado | Fuera de alcance; cambio no implementado |
| Agregar un campo opcional a una respuesta | No evaluado | No evaluado | Fuera de alcance; sin estrategia de Parte IV |
| Eliminar un endpoint | No evaluado | No evaluado | Fuera de alcance; sin estrategia de Parte IV |
| Cambiar el tipo de un identificador | No evaluado | No evaluado | Fuera de alcance; cambio no implementado |

Los contratos vigentes, endpoints y códigos de error están en el [README](../README.md).
La evolución y las verificaciones registradas están en [progress.md](progress.md).
