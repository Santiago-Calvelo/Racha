import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Checkin } from '../checkin/entities/checkin.entity';
import { moverDia, puntosPara, rachaHasta } from './metricas';

@Injectable()
export class PuntosHistoricosService {
  constructor(
    @InjectModel(Checkin.name) private readonly registros: Model<Checkin>,
  ) {}

  async completar(): Promise<void> {
    // Solo antes de aceptar HTTP. No sobrescribe puntajes ya adjudicados.
    const faltantes = await this.registros
      .find({ puntos: { $exists: false } })
      .lean()
      .exec();
    const pares = new Map(
      faltantes.map((r) => [`${r.persona}/${r.desafio}`, r]),
    );
    for (const par of pares.values()) {
      const registros = await this.registros
        .find({ persona: par.persona, desafio: par.desafio })
        .sort({ dia: 1, _id: 1 })
        .lean()
        .exec();
      const dias = new Set<string>();
      for (const registro of registros) {
        if (registro.puntos === undefined) {
          await this.registros.collection.updateOne(
            { _id: registro._id, puntos: { $exists: false } },
            {
              $set: {
                puntos: puntosPara(
                  1 + rachaHasta(dias, moverDia(registro.dia, -1)),
                ),
              },
            },
          );
        }
        dias.add(registro.dia);
      }
    }
  }
}
