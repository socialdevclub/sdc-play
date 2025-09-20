import { HttpException, Injectable, Inject } from '@nestjs/common';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { StockConfig } from 'shared~config';
import { Request, StockSchema, StockStorageSchema, StockUserSchema } from 'shared~type-stock';
import dayjs from 'dayjs';
import { StockUser } from './user.schema';

const STOCK_USER_TABLE_NAME = 'sdc-stock-user';

@Injectable()
export class UserRepository {
  constructor(
    @Inject('DYNAMODB_CLIENT')
    private readonly dynamoDBClient: DynamoDBDocumentClient,
  ) {}

  async create(user: Request.PostCreateUser): Promise<void> {
    try {
      // DynamoDB에서는 트랜잭션을 별도로 처리
      const existingUser = await this.findOne({ stockId: user.stockId, userId: user.userId });

      if (!existingUser) {
        const newStockUser = new StockUser(user, user, user.companyNames);

        const command = new PutCommand({
          Item: newStockUser,
          TableName: STOCK_USER_TABLE_NAME,
        });

        await this.dynamoDBClient.send(command);
      }
    } catch (err) {
      console.error(err);
      throw new HttpException('POST /stock/user/register Unknown Error', 500, { cause: err });
    }
  }

  async count(filter: Partial<StockUserSchema>): Promise<number> {
    try {
      const { stockId } = filter;

      if (stockId) {
        // stockId로 쿼리 수행 (파티션 키 사용)
        const command = new QueryCommand({
          ExpressionAttributeValues: {
            ':stockId': stockId,
          },
          KeyConditionExpression: 'stockId = :stockId',
          Select: 'COUNT',
          TableName: STOCK_USER_TABLE_NAME,
        });

        const { Count } = await this.dynamoDBClient.send(command);
        return Count || 0;
      }
      // 전체 스캔이 필요한 경우
      const command = new ScanCommand({
        TableName: STOCK_USER_TABLE_NAME,
        ...this.buildFilterExpression(filter),
        Select: 'COUNT',
      });

      const { Count } = await this.dynamoDBClient.send(command);
      return Count || 0;
    } catch (error) {
      console.error('Error counting users', error);
      throw error;
    }
  }

  async find(
    filter?: Pick<StockUserSchema, 'stockId'>,
    options?: { consistentRead?: boolean },
  ): Promise<StockUserSchema[]> {
    try {
      const { stockId } = filter || {};

      if (stockId) {
        // stockId로 쿼리 수행 (파티션 키 사용)
        const command = new QueryCommand({
          ConsistentRead: options?.consistentRead,
          ExpressionAttributeValues: {
            ':stockId': stockId,
          },
          KeyConditionExpression: 'stockId = :stockId',
          TableName: STOCK_USER_TABLE_NAME,
        });

        const { Items } = await this.dynamoDBClient.send(command);

        Items.sort((a, b) => a.index - b.index);

        return (Items || []) as StockUserSchema[];
      }
      // 전체 스캔이 필요한 경우
      const command = new ScanCommand({
        ConsistentRead: options?.consistentRead,
        TableName: STOCK_USER_TABLE_NAME,
        ...this.buildFilterExpression(filter),
      });

      const { Items } = await this.dynamoDBClient.send(command);

      Items.sort((a, b) => a.index - b.index);

      return (Items || []) as StockUserSchema[];
    } catch (error) {
      console.error('Error finding users', error);
      throw error;
    }
  }

  async findOne(filter: Pick<StockUserSchema, 'stockId' | 'userId'>): Promise<StockUserSchema | null> {
    try {
      const { stockId, userId } = filter;

      if (!stockId || !userId) {
        throw new Error('stockId and userId must be provided for findOne');
      }

      // 기본 키(stockId, userId)로 조회
      const command = new GetCommand({
        Key: {
          stockId,
          userId,
        },
        TableName: STOCK_USER_TABLE_NAME,
      });

      const { Item } = await this.dynamoDBClient.send(command);
      return Item as StockUserSchema;
    } catch (error) {
      console.error('Error finding user', error);
      throw error;
    }
  }

  async findOneAndUpdate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter: Record<string, any>,
    update: Partial<StockUserSchema>,
  ): Promise<StockUserSchema | null> {
    try {
      const { stockId, userId } = filter;

      if (!stockId || !userId) {
        throw new Error('stockId and userId must be provided for update');
      }

      const { updateExpression, expressionAttributeValues, expressionAttributeNames } =
        this.buildUpdateExpression(update);

      const command = new UpdateCommand({
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Key: {
          stockId,
          userId,
        },
        ReturnValues: 'ALL_NEW',
        TableName: STOCK_USER_TABLE_NAME,
        UpdateExpression: updateExpression,
      });

      const { Attributes } = await this.dynamoDBClient.send(command);
      return Attributes as StockUserSchema;
    } catch (error) {
      console.error('Error updating user', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async deleteOne(filter: Record<string, any>): Promise<boolean> {
    try {
      const { stockId, userId } = filter;

      if (!stockId || !userId) {
        throw new Error('stockId and userId must be provided for deletion');
      }

      const command = new DeleteCommand({
        Key: {
          stockId,
          userId,
        },
        TableName: STOCK_USER_TABLE_NAME,
      });

      await this.dynamoDBClient.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting user', error);
      throw error;
    }
  }

  async deleteMany(filter: Pick<StockUserSchema, 'stockId'>): Promise<boolean> {
    try {
      const users = await this.find(filter);
      const deletionPromises = users.map((user) => {
        const command = new DeleteCommand({
          Key: {
            stockId: user.stockId,
            userId: user.userId,
          },
          TableName: STOCK_USER_TABLE_NAME,
        });
        return this.dynamoDBClient.send(command);
      });

      await Promise.all(deletionPromises);
      return true;
    } catch (error) {
      console.error('Error deleting multiple users', error);
      throw error;
    }
  }

  async updateOne(filter: { stockId: string; userId: string }, update: Partial<StockUserSchema>): Promise<boolean> {
    try {
      await this.findOneAndUpdate(filter, update);
      return true;
    } catch (error) {
      console.error('Error updating user', error);
      throw error;
    }
  }

  // FIXME: 문제 있음. 테스트 코드 만들어야함
  async updateOneWithAdd(
    filter: { stockId: string; userId: string },
    setUpdate: Partial<StockUserSchema>,
    addUpdate: Record<string, number>,
  ): Promise<boolean> {
    try {
      const { stockId, userId } = filter;

      if (!stockId || !userId) {
        throw new Error('stockId and userId must be provided for update');
      }

      const { updateExpression, expressionAttributeValues, expressionAttributeNames } = this.buildMixedUpdateExpression(
        setUpdate,
        addUpdate,
      );

      const command = new UpdateCommand({
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Key: {
          stockId,
          userId,
        },
        TableName: STOCK_USER_TABLE_NAME,
        UpdateExpression: updateExpression,
      });

      await this.dynamoDBClient.send(command);
      return true;
    } catch (error) {
      console.error('Error updating user with ADD', error);
      throw error;
    }
  }

  async initializeUsers(stock: StockSchema): Promise<boolean> {
    try {
      const companies = Object.keys(stock.companies);
      const stockStorages = companies.map((company) => {
        return {
          companyName: company,
          stockAveragePrice: 0,
          stockAveragePriceHistory: new Array(StockConfig.MAX_STOCK_IDX + 1).fill(0),
          stockCountCurrent: 0,
          stockCountHistory: new Array(StockConfig.MAX_STOCK_IDX + 1).fill(0),
        } as StockStorageSchema;
      });

      const users = await this.find({ stockId: stock._id });
      const updatePromises = users.map((user) => {
        return this.findOneAndUpdate(
          { stockId: user.stockId, userId: user.userId },
          {
            lastActivityTime: dayjs().toISOString(),
            money: stock.initialMoney,
            resultByRound: [...(user.resultByRound ?? [])],
            stockStorages,
          },
        );
      });

      await Promise.all(updatePromises);
      return true;
    } catch (e: unknown) {
      throw new Error(e as string);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type
  private buildFilterExpression(filter?: Record<string, any>) {
    if (!filter || Object.keys(filter).length === 0) {
      return {};
    }

    let filterExpression = '';
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    Object.entries(filter).forEach(([key, value], index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;

      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;

      filterExpression += filterExpression ? ` AND ${attrName} = ${attrValue}` : `${attrName} = ${attrValue}`;
    });

    return {
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      FilterExpression: filterExpression,
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private buildUpdateExpression(update: Partial<StockUserSchema>) {
    let updateExpression = 'SET ';
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    Object.entries(update).forEach(([key, value], index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;

      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;

      updateExpression += index > 0 ? `, ${attrName} = ${attrValue}` : `${attrName} = ${attrValue}`;
    });

    return {
      expressionAttributeNames,
      expressionAttributeValues,
      updateExpression,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type
  private buildMixedUpdateExpression(setUpdate: Partial<StockUserSchema>, addUpdate: Record<string, number>) {
    let updateExpression = '';
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    // SET 부분 처리
    if (Object.keys(setUpdate).length > 0) {
      updateExpression += 'SET ';
      Object.entries(setUpdate).forEach(([key, value], index) => {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;

        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;

        updateExpression += index > 0 ? `, ${attrName} = ${attrValue}` : `${attrName} = ${attrValue}`;
      });
    }

    // ADD 부분 처리
    if (Object.keys(addUpdate).length > 0) {
      if (updateExpression) {
        updateExpression += ' ADD ';
      } else {
        updateExpression += 'ADD ';
      }

      Object.entries(addUpdate).forEach(([key, value], index) => {
        const attrName = `#addAttr${index}`;
        const attrValue = `:addVal${index}`;

        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;

        updateExpression += index > 0 ? `, ${attrName} ${attrValue}` : `${attrName} ${attrValue}`;
      });
    }

    return {
      expressionAttributeNames,
      expressionAttributeValues,
      updateExpression,
    };
  }
}
