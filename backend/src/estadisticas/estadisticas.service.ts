import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Checkin } from '../checkin/entities/checkin.entity';
import {
  Desafio,
  calcularEstadoDesafio,
} from '../desafios/entities/desafio.entity';
import { Persona } from '../personas/entities/persona.entity';
import {
  Participacion,
  EstadoParticipacion,
} from '../participaciones/entities/participacion.entity';
import { diaEnZona, hoyReferencia } from '../comun/fechas';
import { PaginacionDto, paginar } from '../comun/paginacion.dto';
import { metricas } from './metricas';

@Injectable()
export class EstadisticasService {
  constructor(
    @InjectModel(Checkin.name) private readonly registros: Model<Checkin>,
    @InjectModel(Desafio.name) private readonly desafios: Model<Desafio>,
    @InjectModel(Persona.name) private readonly personas: Model<Persona>,
    @InjectModel(Participacion.name)
    private readonly participaciones: Model<Participacion>,
  ) {}

  private async persona(id: string) {
    const persona = await this.personas.findById(id).lean().exec();
    if (!persona) throw new NotFoundException('La persona no existe');
    return persona;
  }

  async ranking(desafioId: string) {
    const desafio = await this.desafios.findById(desafioId).lean().exec();
    if (!desafio) throw new NotFoundException('El desafío no existe');
    const estado = calcularEstadoDesafio(desafio);
    const activos = await this.participaciones
      .find({ desafio: desafioId, estado: EstadoParticipacion.ACTIVA })
      .lean()
      .exec();
    const [personas, registros] = await Promise.all([
      this.personas
        .find({ _id: { $in: activos.map((p) => p.persona) } })
        .lean()
        .exec(),
      this.registros.find({ desafio: desafioId }).lean().exec(),
    ]);
    const filas = personas
      .map((p) => ({
        persona: { id: String(p._id), nombre: p.nombre, alias: p.alias },
        ...metricas(
          registros.filter((r) => String(r.persona) === String(p._id)),
          estado === 'FINALIZADO'
            ? desafio.fechaFin
            : diaEnZona(new Date(), p.zonaHoraria),
        ),
      }))
      .sort(
        (a, b) =>
          b.puntos - a.puntos ||
          b.rachaActual - a.rachaActual ||
          (a.persona.alias < b.persona.alias
            ? -1
            : a.persona.alias > b.persona.alias
              ? 1
              : 0),
      );
    const participantes = filas.map((p, i) => ({ ...p, posicion: i + 1 }));
    return {
      desafioId,
      estado,
      participantes,
      ganador: estado === 'FINALIZADO' ? (participantes[0] ?? null) : null,
    };
  }

  async progreso(desafioId: string, personaId: string) {
    const persona = await this.persona(personaId);
    const participacion = await this.participaciones
      .findOne({ desafio: desafioId, persona: personaId })
      .lean()
      .exec();
    if (!participacion)
      throw new NotFoundException('La persona no participó en este desafío');
    const desafio = await this.desafios.findById(desafioId).lean().exec();
    if (!desafio) throw new NotFoundException('El desafío no existe');
    const registros = await this.registros
      .find({ desafio: desafioId, persona: personaId })
      .lean()
      .exec();
    const ranking = await this.ranking(desafioId);
    const hoy = diaEnZona(new Date(), persona.zonaHoraria);
    const hizoCheckinHoy = registros.some((r) => r.dia === hoy);
    return {
      personaId,
      desafioId,
      ...metricas(
        registros,
        ranking.estado === 'FINALIZADO' ? desafio.fechaFin : hoy,
      ),
      posicion:
        ranking.participantes.find((p) => p.persona.id === personaId)
          ?.posicion ?? null,
      participacion: participacion.estado,
      hizoCheckinHoy,
      puedeHacerCheckinHoy:
        participacion.estado === 'ACTIVA' &&
        ranking.estado !== 'CANCELADO' &&
        hoy >= desafio.fechaInicio &&
        hoy <= desafio.fechaFin &&
        !hizoCheckinHoy,
      puedeDeshacerCheckin: hizoCheckinHoy,
    };
  }

  async inicio(personaId: string) {
    const persona = await this.persona(personaId);
    const participaciones = await this.participaciones
      .find({ persona: personaId, estado: EstadoParticipacion.ACTIVA })
      .lean()
      .exec();
    const hoy = hoyReferencia();
    const desafios = await this.desafios
      .find({
        _id: { $in: participaciones.map((p) => p.desafio) },
        fechaCancelacion: null,
        fechaFin: { $gte: hoy },
      })
      .sort({ fechaInicio: -1, _id: -1 })
      .lean()
      .exec();
    return {
      persona,
      desafios: await Promise.all(
        desafios.map(async (d) => ({
          desafio: { ...d, estado: calcularEstadoDesafio(d) },
          participantesActivos: await this.participaciones.countDocuments({
            desafio: d._id,
            estado: EstadoParticipacion.ACTIVA,
          }),
          progreso: await this.progreso(String(d._id), personaId),
        })),
      ),
    };
  }

  async resultados(personaId: string, pagina: PaginacionDto) {
    await this.persona(personaId);
    const participaciones = await this.participaciones
      .find({ persona: personaId })
      .lean()
      .exec();
    const filtro = {
      _id: { $in: participaciones.map((p) => p.desafio) },
      fechaCancelacion: null,
      fechaFin: { $lt: hoyReferencia() },
    };
    const [total, desafios] = await Promise.all([
      this.desafios.countDocuments(filtro),
      this.desafios
        .find(filtro)
        .sort({ fechaFin: -1, _id: -1 })
        .skip((pagina.pagina - 1) * pagina.limite)
        .limit(pagina.limite)
        .lean()
        .exec(),
    ]);
    const items = await Promise.all(
      desafios.map(async (d) => ({
        desafio: { ...d, estado: calcularEstadoDesafio(d) },
        progreso: await this.progreso(String(d._id), personaId),
        ganador: (await this.ranking(String(d._id))).ganador,
      })),
    );
    return paginar(items, total, pagina);
  }
}
