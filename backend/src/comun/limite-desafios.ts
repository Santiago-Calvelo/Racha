import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClientSession, Model, Types } from 'mongoose';
import { PersonaDocumento } from '../personas/entities/persona.entity';
import { DesafioDocumento } from '../desafios/entities/desafio.entity';
import {
  EstadoParticipacion,
  ParticipacionDocumento,
} from '../participaciones/entities/participacion.entity';
import { MAXIMO_DESAFIOS_VIGENTES_POR_PERSONA } from './constantes';
import { hoyReferencia } from './fechas';

export async function verificarTopeVigentes(
  persona: Types.ObjectId,
  modelos: {
    personas: Model<PersonaDocumento>;
    desafios: Model<DesafioDocumento>;
    participaciones: Model<ParticipacionDocumento>;
  },
  sesion: ClientSession,
): Promise<void> {
  // Toda creación o unión escribe la misma persona antes del conteo.
  // Un conflicto de escritura obliga a reintentar la transacción completa.
  const bloqueo = await modelos.personas.updateOne(
    { _id: persona },
    { $inc: { __v: 1 } },
    { session: sesion },
  );
  if (bloqueo.matchedCount === 0)
    throw new NotFoundException('Persona no encontrada');
  const participaciones = await modelos.participaciones
    .find({ persona, estado: EstadoParticipacion.ACTIVA })
    .session(sesion)
    .select('desafio')
    .lean()
    .exec();
  const vigentes = await modelos.desafios
    .countDocuments({
      _id: {
        $in: participaciones.map((participacion) => participacion.desafio),
      },
      fechaCancelacion: null,
      fechaFin: { $gte: hoyReferencia() },
    })
    .session(sesion)
    .exec();
  if (vigentes >= MAXIMO_DESAFIOS_VIGENTES_POR_PERSONA) {
    throw new ConflictException(
      `Cada persona puede tener hasta ${MAXIMO_DESAFIOS_VIGENTES_POR_PERSONA} desafíos vigentes, contando los creados`,
    );
  }
}
