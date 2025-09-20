import { Body, Controller, Delete, Get, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import { Request, Response } from 'shared~type-stock';
import { UserService } from './user.service';
import { StockUser } from './user.schema';
import { UserRepository } from './user.repository';

@Controller('/stock/user')
export class UserController {
  constructor(private readonly userService: UserService, private readonly userRepository: UserRepository) {}

  @Get()
  async getUsers(@Query('stockId') stockId: string): Promise<Response.GetStockUser[]> {
    const users = await this.userService.getUserList(stockId);
    return users;
  }

  @Get('/recommended-partners')
  async getRecommendedPartners(@Query('stockId') stockId: string, @Query('userId') userId: string): Promise<string[]> {
    return this.userService.getRecommendedPartners(stockId, userId);
  }

  @Get('/count')
  async getUserCount(@Query('stockId') stockId: string): Promise<{ count: number }> {
    const count = await this.userRepository.count({ stockId });
    return { count };
  }

  @Get('/find-one')
  async findOneUser(
    @Query('stockId') stockId: string,
    @Query('userId') userId: string,
  ): Promise<Response.GetStockUser> {
    const user = await this.userService.findOneByUserId(stockId, userId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  @Post()
  setUser(@Body() body: StockUser): Promise<boolean> {
    return this.userService.setUser(body);
  }

  @Post('/register')
  async registerUser(@Body() body: Request.PostCreateUser): Promise<Response.GetCreateUser> {
    await this.userRepository.create(body);
    return { messageId: 'direct' };
  }

  @Post('/initialize')
  async initializeUsers(@Query('stockId') stockId: string): Promise<boolean> {
    return this.userService.initializeUsers(stockId);
  }

  @Post('/align-index')
  async alignIndex(@Query('stockId') stockId: string): Promise<{ result: boolean }> {
    await this.userService.alignIndex(stockId);
    return { result: true };
  }

  @Post('/introduce')
  async setIntroduce(@Body() body: Request.PostIntroduce): Promise<Response.SetIntroduce> {
    return this.userService.setIntroduce(body.stockId, body.userId, body.introduction);
  }

  @Post('loan')
  async startLoan(@Body() body: Request.PostLoan): Promise<Response.Common> {
    return this.userService.startLoan(body.stockId, body.userId);
  }

  @Post('loan/settle')
  async settleLoan(@Body() body: Request.PostSettleLoan): Promise<Response.Common> {
    return this.userService.settleLoan(body.stockId, body.userId);
  }

  @Delete()
  async removeUser(@Body() body: Request.RemoveStockUser): Promise<{ result: boolean }> {
    return { result: !!(await this.userService.removeUser(body.stockId, body.userId)) };
  }

  @Delete('/all')
  async removeAllUser(@Query('stockId') stockId: string): Promise<{ result: boolean }> {
    return { result: !!(await this.userService.removeAllUser(stockId)) };
  }
}
