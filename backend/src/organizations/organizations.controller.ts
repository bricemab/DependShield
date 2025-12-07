import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Get()
    async findAll(@Request() req) {
        return this.organizationsService.findByUser(req.user.userId);
    }
}
