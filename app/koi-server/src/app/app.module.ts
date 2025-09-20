import { Module } from '@nestjs/common';
import { StockModule } from 'feature-nest-stock';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PartyModule } from './party/party.module';
import { DynamoDBModule } from './dynamodb/dynamodb.module';

@Module({
  controllers: [AppController],
  imports: [
    // MongooseModule.forRoot(process.env.MONGO_URI, {
    //   ignoreUndefined: true,
    //   maxIdleTimeMS: 60000,
    // }),
    DynamoDBModule,
    // PollModule,
    StockModule,
    PartyModule,
  ],
  providers: [AppService],
})
export class AppModule {}
