import { BadRequestException, PipeTransform } from '@nestjs/common';

export class MongoIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[a-f\d]{24}$/i.test(value)) {
      throw new BadRequestException('El id debe ser un ObjectId válido');
    }
    return value;
  }
}
