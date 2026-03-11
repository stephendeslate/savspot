import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NoteEntityType } from '../../../../prisma/generated/prisma';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@ApiTags('Notes')
@ApiBearerAuth()
@UseGuards(TenantRolesGuard)
@Controller('tenants/:tenantId/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Create a note on a booking or client' })
  @ApiResponse({ status: 201, description: 'Note created' })
  async create(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.createNote(tenantId, userId, dto);
  }

  @Get('timeline')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get a paginated timeline of all notes for a tenant' })
  @ApiResponse({ status: 200, description: 'Paginated notes timeline' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async timeline(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notesService.getTimeline(
      tenantId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get()
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List notes for a specific entity' })
  @ApiResponse({ status: 200, description: 'List of notes' })
  @ApiQuery({ name: 'entityType', enum: ['BOOKING', 'CLIENT'] })
  @ApiQuery({ name: 'entityId', type: String })
  async list(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Query('entityType') entityType: NoteEntityType,
    @Query('entityId') entityId: string,
  ) {
    return this.notesService.listNotes(tenantId, entityType, entityId);
  }

  @Patch(':id')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Update a note body (author only)' })
  @ApiResponse({ status: 200, description: 'Note updated' })
  @ApiResponse({ status: 403, description: 'Not the note author' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async update(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.updateNote(tenantId, id, userId, dto);
  }

  @Delete(':id')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Delete a note (author only)' })
  @ApiResponse({ status: 200, description: 'Note deleted' })
  @ApiResponse({ status: 403, description: 'Not the note author' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async remove(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.deleteNote(tenantId, id, userId);
  }

  @Patch(':id/pin')
  @TenantRoles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Toggle pin status of a note' })
  @ApiResponse({ status: 200, description: 'Note pin toggled' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async togglePin(
    @Param('tenantId', UuidValidationPipe) tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.notesService.togglePin(tenantId, id);
  }
}
