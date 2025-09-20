import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { Request } from 'shared~type-party';
import { PartyService } from './party.service';
import { Party } from './schema/party.schema';

@Controller('party')
export class PartyController {
  constructor(private readonly partyService: PartyService) {}

  @Get('/query')
  queryParties(): Promise<Party[]> {
    return this.partyService.queryParties();
  }

  @Get('/query/:partyId')
  async queryParty(@Param('partyId') partyId: string): Promise<Party> {
    const party = await this.partyService.queryParty(partyId);
    if (!party) {
      throw new HttpException('Party not found', HttpStatus.NOT_FOUND);
    }
    return party;
  }

  @Post()
  createParty(@Body() party: Party): Promise<Party> {
    return this.partyService.createParty(party);
  }

  @Post('/join')
  joinParty(@Body() body: Request.PostJoinParty): Promise<Party> {
    return this.partyService.joinParty(body.partyId, body.userId);
  }

  @Post('/leave')
  leaveParty(@Body() body: Request.PostLeaveParty): Promise<Party> {
    return this.partyService.leaveParty(body.partyId, body.userId);
  }

  @Patch()
  updateParty(@Body() body: Request.PatchParty): Promise<boolean> {
    return this.partyService.updateParty(body);
  }

  @Delete()
  deleteParty(@Query('partyId') partyId: string): Promise<boolean> {
    return this.partyService.deleteParty(partyId);
  }
}
