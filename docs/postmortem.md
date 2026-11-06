# Postmortem — cierre de Partes I–III

**Parte IV no realizada**. Este informe resume hechos registrados durante las
Partes I–III; no representa el informe de una publicación o distribución de Parte IV.

## Alcance entregado

- Backend NestJS/MongoDB: reglas de desafíos, participantes, check-ins, puntos,
  rachas, ranking, resumen y paginación.
- App Expo/React Native: navegación y pantallas integradas con cliente HTTP tipado.
- Parte III: Auth0/Google, JWT, alias, salas Socket.IO y alientos efímeros.
- Soporte web adicional con Auth0 SPA, calendario HTML y CORS restringido al origen.
- README, plantillas de entorno independientes y colección Postman versionados.

## Problemas y decisiones

| Problema observado | Acción y resultado |
| --- | --- |
| Atlas rechazó credenciales | Se diagnosticó `bad auth`; no se alteraron credenciales ni se publicaron secretos |
| SDK Auth0 no disponible en Expo Go | Se eligió development build; el mínimo Android se elevó a API 26 |
| Ninja falló creando una ruta de 260 caracteres | Se probaron unidad virtual y Ninja 1.13.2; el build nativo continuó fallando |
| Autolinking mezcló C: y R: | Se retiró la unidad virtual; el launcher conserva la ruta original |
| Rutas largas deshabilitadas en Windows | El autor rechazó cambiar el registro y aprobó usar web como alternativa |
| Auth0 usaba Client ID Native en web | Se indicó crear una SPA separada y registrar callbacks y Web Origins |
| Preflight sin cabeceras CORS | El proceso anterior respondía 404 a OPTIONS; el autor reportó resuelto tras reiniciar el backend actualizado |

## Evidencia y límites

Build backend, tipos, lint, pruebas móviles, e2e HTTP/Socket.IO y exportación web
fueron ejecutados. Chrome headless renderizó el mensaje de configuración faltante.
Las pruebas de Parte II en Android/Expo Go figuran en [progress.md](progress.md).

No se verificaron el recorrido completo de Google con dos cuentas en Parte III,
la persistencia nativa segura en un development build funcionando ni iOS.
La alternativa web no acredita esas pruebas de dispositivos exigidas por la consigna.
No se publicó el repositorio, no se envió WebCampus y no se comprobó su fecha límite.

## Aprendizajes

Verificar requisitos de SDK y herramientas nativas al elegir el proveedor; separar
los clientes Native/SPA; reiniciar servicios al cambiar configuración de arranque;
distinguir pruebas automatizadas de un recorrido real. Conservar los resultados
fallidos evita presentar una compilación incompleta como una prueba exitosa.

No se implementaron compatibilidad/versionado de Parte IV, analítica, sunset ni
una publicación identificada por `app-1.0.0`. Los tags I–III marcan cortes históricos
del repositorio y no eliminan estos límites.
