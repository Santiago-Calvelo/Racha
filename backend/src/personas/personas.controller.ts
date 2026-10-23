import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PersonasService } from './personas.service';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { MongoIdPipe } from '../comun/mongo-id.pipe';
import { UsuarioId } from '../comun/usuario.guard';

@Controller('personas')
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Post()
  create(@Body() createPersonaDto: CreatePersonaDto) {
    return this.personasService.create(createPersonaDto);
  }

  @Get()
  findAll() {
    return this.personasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', MongoIdPipe) id: string) {
    return this.personasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', MongoIdPipe) id: string,
    @Body() updatePersonaDto: UpdatePersonaDto,
    @UsuarioId() usuarioId: string,
  ) {
    return this.personasService.update(id, updatePersonaDto, usuarioId);
  }

  @Delete(':id')
  remove(@Param('id', MongoIdPipe) id: string, @UsuarioId() usuarioId: string) {
    return this.personasService.remove(id, usuarioId);
  }
}
