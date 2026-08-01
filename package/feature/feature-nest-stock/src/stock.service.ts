import { HttpException, HttpStatus, Injectable, Inject, forwardRef } from '@nestjs/common';
import type {
  Request,
  StockPhase,
  StockSchema,
  StockSchemaWithId,
  HintVisibility,
  HintDetail,
  CompanyInfo,
} from 'shared~type-stock';
import { getDateDistance } from '@toss/date';
import { ceilToUnit } from '@toss/utils';
import dayjs from 'dayjs';
import { StockConfig } from 'shared~config';
import { UserService } from './user/user.service';
import { StockRepository } from './stock.repository';
import { UserRepository } from './user/user.repository';

// V2 내부용 고정 가격 이벤트 타입 (저장하지 않음)
type FixedPriceEvent = {
  companyName: string;
  round: number;
  direction: 'up' | 'down';
  fluctuation: number;
};

@Injectable()
export class StockService {
  constructor(
    private readonly stockRepository: StockRepository,
    @Inject(forwardRef(() => UserRepository))
    private readonly userRepository: UserRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async find(): Promise<StockSchemaWithId[]> {
    return this.stockRepository.find();
  }

  async findOneById(stockId: string): Promise<StockSchemaWithId | null> {
    return this.stockRepository.findOneById(stockId);
  }

  async findOneByIdAndUpdate(stock: Request.PatchUpdateStock): Promise<StockSchemaWithId | null> {
    return this.stockRepository.findOneAndUpdate(stock._id, stock);
  }

  async createStock(): Promise<StockSchemaWithId> {
    return this.stockRepository.create();
  }

  async resetStock(stockId: string): Promise<StockSchemaWithId | null> {
    try {
      // 스톡 업데이트
      const stock = await this.stockRepository.findOneAndUpdate(stockId, {
        companies: {},
        fluctuationsInterval: 5,
        isTransaction: false,
        isVisibleRank: false,
        remainingStocks: {},
        round: 0,
        startedTime: dayjs().toISOString(),
        stockPhase: 'CROWDING',
        transactionInterval: 0,
      });

      return stock;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async initStock(stockId: string, body: Request.PostStockInit): Promise<StockSchemaWithId | null> {
    const { isCustomCompanies, companies, maxStockHintCount, maxMarketStockCount } = body;

    const stockNames = isCustomCompanies ? Object.keys(companies) : body.stockNames;
    const newCompanies: StockSchema['companies'] = {};
    const flatCompanies: { companyName: string; round: number; price: number; fluctuation: number }[] = [];

    // 주식표 정의
    if (isCustomCompanies) {
      Object.entries(companies).forEach(([company, value]) => {
        newCompanies[company] = value.map((v) => ({
          ...v,
          정보: [],
        }));
      });
    } else {
      const defineCompany = ({
        companyName,
        round,
        price,
        fluctuation,
      }: {
        companyName: string;
        round: number;
        price: number;
        fluctuation: number;
      }): void => {
        if (!newCompanies[companyName]) {
          newCompanies[companyName] = [];
        }
        newCompanies[companyName][round] = {
          가격: price,
          정보: [],
        };
        flatCompanies.push({ companyName, fluctuation, price, round });
      };

      stockNames?.forEach((company) => {
        for (let round = 0; round <= StockConfig.MAX_STOCK_IDX; round++) {
          if (round === 0) {
            defineCompany({
              companyName: company,
              fluctuation: 0,
              price: StockConfig.INIT_STOCK_PRICE,
              round,
            });
            continue;
          }

          const prevPrice = newCompanies[company][round - 1].가격;

          const calc1 = Math.floor(Math.random() * prevPrice - prevPrice / 2);
          const calc2 = Math.floor(Math.random() * StockConfig.INIT_STOCK_PRICE - StockConfig.INIT_STOCK_PRICE / 2);

          const frunc = Math.abs(calc1) >= Math.abs(calc2) ? calc1 : prevPrice + calc2 <= 0 ? calc1 : calc2;
          const price = ceilToUnit(prevPrice + frunc, StockConfig.INIT_STOCK_PRICE / 1000);

          defineCompany({
            companyName: company,
            fluctuation: frunc,
            price,
            round,
          });
        }
      });
    }

    // 상승한 주식들을 변동폭이 작은 순서대로 정렬합니다.
    const _upwardCompanies = flatCompanies
      .filter((v) => v.fluctuation > 0)
      .sort((a, b) => a.fluctuation - b.fluctuation);

    // 하락한 주식들을 변동폭이 작은 순서대로 정렬합니다.
    const _downwardCompanies = flatCompanies
      .filter((v) => v.fluctuation < 0)
      .sort((a, b) => b.fluctuation - a.fluctuation);

    let upwardCompanies = [..._upwardCompanies];
    let downwardCompanies = [..._downwardCompanies];

    const players = await this.userService.getUserList(stockId);
    const playerIds = players.map((v) => v.userId);

    // 플레이어 목록을 먼저 랜덤으로 돌린다
    // 플레이어 순서대로 +, -, +, -, ... 정보를 뽑는다
    // 남은 힌트 없으면 반대 부호를 뽑는다. 다만, 반대 부호도 없으면 +, - 리스트를 새로 가져온다
    // 힌트 개수는 1~30명은 6개, 31~45명은 4개, 46명 이상은 2개
    const hintCount = Math.min(
      Math.min(Math.max(Math.floor(90 / players.length), 1), 3) * 2,
      maxStockHintCount ?? Infinity,
    );

    const randomPlayers = [...playerIds].sort(() => Math.random() - 0.5);
    const hintPlayers: {
      userId: string;
      companyName: string;
      round: number;
      fluctuation: number;
    }[] = [];

    const pushUpward = (userId: string): void => {
      if (!upwardCompanies.length) {
        upwardCompanies = [..._upwardCompanies];
      }
      const upwardCompany = upwardCompanies.shift();
      if (!upwardCompany) {
        throw new Error('Upward company not found');
      }
      hintPlayers.push({
        companyName: upwardCompany.companyName,
        fluctuation: upwardCompany.fluctuation,
        round: upwardCompany.round,
        userId,
      });
    };

    const pushDownward = (userId: string): void => {
      if (!downwardCompanies.length) {
        downwardCompanies = [..._downwardCompanies];
      }
      const downwardCompany = downwardCompanies.shift();
      if (!downwardCompany) {
        throw new Error('Downward company not found');
      }
      hintPlayers.push({
        companyName: downwardCompany.companyName,
        fluctuation: downwardCompany.fluctuation,
        round: downwardCompany.round,
        userId,
      });
    };

    for (let _ = 0; _ < hintCount; _++) {
      for (const userId of randomPlayers) {
        const hintPlayer = hintPlayers.filter((v) => v.userId === userId);
        const upwardCount = hintPlayer.filter((v) => v.fluctuation > 0).length;
        const downwardCount = hintPlayer.filter((v) => v.fluctuation < 0).length;

        if (upwardCompanies.length === 0 && downwardCompanies.length === 0) {
          upwardCompanies = [..._upwardCompanies];
          downwardCompanies = [..._downwardCompanies];
        }

        if (upwardCount <= downwardCount) {
          if (upwardCompanies.length > 0) {
            pushUpward(userId);
          } else if (downwardCompanies.length > 0) {
            pushDownward(userId);
          }
        } else if (downwardCompanies.length > 0) {
          pushDownward(userId);
        } else if (upwardCompanies.length > 0) {
          pushUpward(userId);
        }
      }
    }

    // 힌트 주입하기
    console.log('🚀 ~ StockService ~ initStock ~ hintPlayers:', hintPlayers);
    for (const hint of hintPlayers) {
      const { userId, companyName, round } = hint;

      const { 정보 } = newCompanies[companyName][round];
      if (!정보.some((v) => v === userId)) {
        정보.push(userId);
      }
    }

    // 주식 재고 주입하기
    const remainingStocks = {};
    Object.keys(newCompanies).forEach((company) => {
      remainingStocks[company] = maxMarketStockCount;
    });

    return this.stockRepository.findOneAndUpdate(stockId, {
      companies: newCompanies,
      isTransaction: false,
      isVisibleRank: false,
      maxStockHintCount,
      remainingStocks,
      startedTime: dayjs().toISOString(),
      stockPhase: 'PLAYING',
    });
  }

  async initStockDalto(stockId: string, body: Request.PostStockInit): Promise<StockSchemaWithId | null> {
    const { stockNames, maxMarketStockCount, maxStockHintCount } = body;

    const newCompanies: StockSchema['companies'] = {};
    const hintCompanies: { companyName: string; round: number; price: number; infos: string[] }[] = [];

    // 주식표 정의
    const defineCompany = ({
      companyName,
      round,
      price,
    }: {
      companyName: string;
      round: number;
      price: number;
    }): void => {
      if (!newCompanies[companyName]) {
        newCompanies[companyName] = [];
      }
      newCompanies[companyName][round] = {
        가격: price,
        정보: [],
      };

      if (!companyName.includes('종합지수') && !companyName.includes('2배')) {
        hintCompanies.push({ companyName, infos: [], price, round });
      }
    };

    // 일반주식
    stockNames?.forEach((company) => {
      for (let round = 0; round <= StockConfig.MAX_STOCK_IDX; round++) {
        if (round !== 3 && round !== 6 && round !== 9) {
          if (Math.floor(round / 3) > 0) {
            defineCompany({
              companyName: company,
              price: newCompanies[company][Math.floor(round / 3) * 3].가격,
              round,
            });
            continue;
          }
          defineCompany({
            companyName: company,
            price: StockConfig.INIT_STOCK_PRICE,
            round,
          });
          continue;
        }

        const prevPrice = newCompanies[company][round - 1].가격;

        const calc1 = Math.floor(Math.random() * prevPrice - prevPrice / 2);
        const calc2 = Math.floor(Math.random() * StockConfig.INIT_STOCK_PRICE - StockConfig.INIT_STOCK_PRICE / 2);

        const frunc = Math.abs(calc1) >= Math.abs(calc2) ? calc1 : prevPrice + calc2 <= 0 ? calc1 : calc2;
        const price = ceilToUnit(prevPrice + frunc, StockConfig.INIT_STOCK_PRICE / 1000);

        defineCompany({
          companyName: company,
          price,
          round,
        });
      }
    });

    function pushHint(userId: string, companyName: string, idx: number): void {
      hintCompanies.find((v) => v.companyName === companyName && v.round === idx)?.infos.push(userId);
      newCompanies[companyName][idx].정보.push(userId);
    }

    function getCompanies(idx: number, userId: string): { companyName: string; price: number; round: number }[] {
      return hintCompanies
        .filter((v) => v.round === idx && !v.infos.some((v) => v === userId))
        .sort(() => Math.random() - 0.5)
        .sort((a, b) => a.infos.length - b.infos.length);
    }

    const players = await this.userService.getUserList(stockId);
    const getPlayerIds = (): string[] => players.map((v) => v.userId).sort(() => Math.random() - 0.5);

    for (const idx of [3, 3, 6, 6, 9, 9]) {
      for (const userId of getPlayerIds()) {
        const company = getCompanies(idx, userId)[0];
        if (company === undefined) {
          continue;
        }
        pushHint(userId, company.companyName, idx);
      }
    }

    // 주식 재고 주입하기
    const remainingStocks = {};
    Object.keys(newCompanies).forEach((company) => {
      remainingStocks[company] = maxMarketStockCount;
    });

    return this.stockRepository.findOneAndUpdate(stockId, {
      companies: newCompanies,
      isTransaction: false,
      isVisibleRank: false,
      maxStockHintCount,
      remainingStocks,
      startedTime: dayjs().toISOString(),
      stockPhase: 'PLAYING',
    });
  }

  // ============================================
  // V2 헬퍼 함수들
  // ============================================

  /**
   * A형 가시성: 종목명 O, 라운드 X, 방향 X, 변동폭 O
   */
  private static readonly VISIBILITY_TYPE_A: HintVisibility = {
    companyName: true,
    direction: false,
    fluctuation: true,
    round: false,
  };

  /**
   * B형 가시성: 종목명 X, 라운드 O, 방향 O, 변동폭 O
   */
  private static readonly VISIBILITY_TYPE_B: HintVisibility = {
    companyName: false,
    direction: true,
    fluctuation: true,
    round: true,
  };

  /**
   * 고정 가격 이벤트(찌라시) 생성
   * - 이벤트 수: ceil(참가자수 × 3 / 4)
   * - 변동 범위: 1~50% (중복 회피)
   * - 라운드: 1~9에 랜덤 분배
   */
  private generateFixedPriceEvents(eventCount: number, stockNames: string[]): FixedPriceEvent[] {
    const events: FixedPriceEvent[] = [];
    const rounds = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    // up/down 각각 절반씩
    const upCount = Math.ceil(eventCount / 2);
    const downCount = Math.floor(eventCount / 2);

    // 변동률 풀 생성 (10~50)
    const fluctuations = Array.from({ length: 41 }, (_, i) => i + 10);

    // Fisher-Yates 셔플
    const shuffle = <T>(arr: T[]): T[] => {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };

    const shuffledUp = shuffle(fluctuations);
    const shuffledDown = shuffle(fluctuations);

    // up 이벤트 생성
    for (let i = 0; i < upCount; i++) {
      events.push({
        companyName: stockNames[Math.floor(Math.random() * stockNames.length)],
        direction: 'up',
        fluctuation: shuffledUp[i % 50],
        round: rounds[Math.floor(Math.random() * rounds.length)],
      });
    }

    // down 이벤트 생성
    for (let i = 0; i < downCount; i++) {
      events.push({
        companyName: stockNames[Math.floor(Math.random() * stockNames.length)],
        direction: 'down',
        fluctuation: shuffledDown[i % 50],
        round: rounds[Math.floor(Math.random() * rounds.length)],
      });
    }

    // 최종 셔플 (up/down 섞기)
    return shuffle(events);
  }

  /**
   * V2용 회사 초기화
   * - 1라운드(idx 0~2): 100,000원 고정, 가격 변동 없음
   * - 이후 라운드: 기존 로직과 동일
   */
  private initializeCompaniesV2(stockNames: string[], events: FixedPriceEvent[]): Record<string, CompanyInfo[]> {
    const newCompanies: Record<string, CompanyInfo[]> = {};

    // 목표 변동률에 가장 가까운 100원 단위 가격 선택
    const roundToClosestPercentage = (prevPrice: number, targetPercent: number, direction: 'up' | 'down'): number => {
      const multiplier = direction === 'up' ? 1 + targetPercent / 100 : 1 - targetPercent / 100;
      const exactPrice = prevPrice * multiplier;

      const floorPrice = Math.floor(exactPrice / 100) * 100;
      const ceilPrice = Math.ceil(exactPrice / 100) * 100;

      // 각 가격의 실제 변동률 계산
      const floorPercent = Math.abs((floorPrice - prevPrice) / prevPrice) * 100;
      const ceilPercent = Math.abs((ceilPrice - prevPrice) / prevPrice) * 100;

      // 목표 변동률과의 차이 비교
      const floorDiff = Math.abs(floorPercent - targetPercent);
      const ceilDiff = Math.abs(ceilPercent - targetPercent);

      const selectedPrice = floorDiff <= ceilDiff ? floorPrice : ceilPrice;
      return Math.max(selectedPrice, 100);
    };

    stockNames.forEach((company) => {
      newCompanies[company] = [];

      for (let round = 0; round <= StockConfig.MAX_STOCK_IDX; round++) {
        // 1라운드 (round 0): 100,000원 고정
        if (round === 0) {
          newCompanies[company][round] = {
            가격: StockConfig.INIT_STOCK_PRICE,
            정보: [],
          };
          continue;
        }

        const prevPrice = newCompanies[company][round - 1].가격;

        // 해당 라운드에 고정 가격 이벤트가 있는지 확인
        const event = events.find((e) => e.companyName === company && e.round === round);

        if (event) {
          // 고정 가격 이벤트 적용
          const price = roundToClosestPercentage(prevPrice, event.fluctuation, event.direction);

          newCompanies[company][round] = {
            fixedFluctuation: event.direction === 'up' ? event.fluctuation : -event.fluctuation,
            가격: price,
            정보: [],
          };
        } else {
          // 이벤트 없으면 이전 라운드 가격 유지
          newCompanies[company][round] = {
            가격: prevPrice,
            정보: [],
          };
        }
      }
    });

    return newCompanies;
  }

  /**
   * 카드 배분 (A형 2장 + B형 2장 × 이벤트 수)
   * - 1인당 3장 배분
   */
  private distributeCards(
    events: FixedPriceEvent[],
    players: { userId: string }[],
  ): { userId: string; event: FixedPriceEvent; isVisible: HintVisibility }[] {
    // 각 이벤트당 4장 (A형 2장 + B형 2장)
    const createCards = (eventList: FixedPriceEvent[]): { event: FixedPriceEvent; isVisible: HintVisibility }[] => {
      const cards: { event: FixedPriceEvent; isVisible: HintVisibility }[] = [];
      for (const event of eventList) {
        cards.push({ event, isVisible: StockService.VISIBILITY_TYPE_A });
        cards.push({ event, isVisible: StockService.VISIBILITY_TYPE_A });
        cards.push({ event, isVisible: StockService.VISIBILITY_TYPE_B });
        cards.push({ event, isVisible: StockService.VISIBILITY_TYPE_B });
      }
      return cards;
    };

    // Fisher-Yates 셔플
    const shuffle = <T>(arr: T[]): T[] => {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };

    // 모든 카드 생성 후 셔플
    const allCards = shuffle(createCards(events));

    // 1인당 배분할 카드 수 계산
    const cardsPerPlayer = 3;
    const totalNeeded = players.length * cardsPerPlayer;

    // 카드가 부족하면 경고 (로직상 발생하지 않아야 함)
    if (allCards.length < totalNeeded) {
      console.warn(`[V2] 카드 부족: 필요 ${totalNeeded}장, 보유 ${allCards.length}장`);
    }

    // 스마트 배분: 각 플레이어에게 최대한 다른 이벤트 카드를 배분
    const distributed: { userId: string; event: FixedPriceEvent; isVisible: HintVisibility }[] = [];
    const availableCards = [...allCards]; // 남은 카드들
    const playerEventMap = new Map<string, Set<number>>(); // 플레이어별 받은 이벤트 라운드 추적

    // 각 플레이어 초기화
    for (const player of players) {
      playerEventMap.set(player.userId, new Set());
    }

    // 라운드 로빈 방식으로 카드 배분 (한 장씩 돌아가며)
    for (let cardRound = 0; cardRound < cardsPerPlayer; cardRound++) {
      // 플레이어 순서도 셔플하여 공정성 확보
      const shuffledPlayers = shuffle([...players]);

      for (const player of shuffledPlayers) {
        if (availableCards.length === 0) break;

        const playerEvents = playerEventMap.get(player.userId)!;

        // 1순위: 아직 받지 않은 이벤트의 카드 찾기
        let selectedIndex = availableCards.findIndex((card) => !playerEvents.has(card.event.round));

        // 2순위: 없으면 아무 카드나 선택
        if (selectedIndex === -1) {
          selectedIndex = 0;
        }

        // 카드 배분
        const selectedCard = availableCards.splice(selectedIndex, 1)[0];
        playerEvents.add(selectedCard.event.round);
        distributed.push({ userId: player.userId, ...selectedCard });
      }
    }

    return distributed;
  }

  /**
   * 카드 정보를 회사에 주입
   * - 정보: userId 목록 (기존 호환)
   * - hints: 카드 상세 정보 (V2 전용)
   */
  private injectCardsToCompanies(
    companies: Record<string, CompanyInfo[]>,
    cards: { userId: string; event: FixedPriceEvent; isVisible: HintVisibility }[],
  ): void {
    for (const card of cards) {
      const { userId, event, isVisible } = card;
      const companyInfo = companies[event.companyName]?.[event.round];

      if (companyInfo) {
        // 정보에 userId 추가 (기존 호환)
        if (!companyInfo.정보.includes(userId)) {
          companyInfo.정보.push(userId);
        }

        // hints에 상세 정보 추가 (V2 전용)
        if (!companyInfo.hints) {
          companyInfo.hints = [];
        }
        const hintDetail: HintDetail = { isVisible, userId };
        companyInfo.hints.push(hintDetail);
      }
    }
  }

  /**
   * initStockV2 - V2 게임 모드 초기화
   *
   * 특징:
   * - 1라운드: 100,000원 고정, 가격 변동 없음 (거래 연습)
   * - 고정 가격 이벤트(찌라시): 게임 시작 시 미리 계산
   * - 카드 시스템: A형/B형 가시성 기반
   * - 초기 자산: 50만원 + 랜덤 주식 5주
   */
  async initStockV2(stockId: string, body: Request.PostStockInit): Promise<StockSchemaWithId | null> {
    const { stockNames, maxMarketStockCount, maxStockHintCount, initialStockCount = 0 } = body;

    if (!stockNames) {
      throw new Error('Stock names not found');
    }

    // 1. 참가자 조회
    const players = await this.userService.getUserList(stockId);

    // 2. 고정 가격 이벤트 생성 (이벤트 수 = ceil(참가자수 × 3 / 4))
    const eventCount = Math.ceil((players.length * 3) / 4);
    const events = this.generateFixedPriceEvents(eventCount, stockNames);

    // 3. 회사 초기화 (1라운드 100,000원 고정)
    const companies = this.initializeCompaniesV2(stockNames, events);

    // 4. 카드 배분 (A형 2장 + B형 2장 × 이벤트 수)
    const cards = this.distributeCards(events, players);

    // 5. 정보 필드에 카드 주입
    this.injectCardsToCompanies(companies, cards);

    // 6. 주식 재고 주입
    const remainingStocks: Record<string, number> = {};
    stockNames?.forEach((company) => {
      remainingStocks[company] = maxMarketStockCount;
    });

    // 7. 저장 (V2 전용 필드 포함)
    // events는 저장하지 않음 - 이미 companies의 fixedFluctuation에 반영됨
    return this.stockRepository.findOneAndUpdate(stockId, {
      companies,
      gameMode: 'v2',
      gradeConfig: {
        multipliers: { ant: 2.0, shrimp: 1.0, whale: 0.5 },
        thresholds: { shrimp: 0.7, whale: 0.3 },
      },
      initialStockCount, // V2: 초기 지급 주식 수량 (게임 설정에서 선택)
      isTransaction: false,
      isVisibleRank: false,
      maxStockHintCount,
      remainingStocks,
      startedTime: dayjs().toISOString(),
      stockPhase: 'PLAYING',
    });
  }

  async drawStockInfo(stockId: string, body: Request.PostDrawStockInfo): Promise<StockSchemaWithId | null> {
    try {
      const { userId } = body;

      const stock = await this.stockRepository.findOneById(stockId);
      const user = await this.userRepository.findOne({ stockId, userId });

      if (!stock) {
        throw new HttpException('스톡을 찾을 수 없습니다', HttpStatus.NOT_FOUND);
      }

      if (!stock.isTransaction) {
        throw new HttpException('지금은 거래할 수 없습니다', HttpStatus.CONFLICT);
      }

      if (!user) {
        throw new HttpException('유저 정보를 불러올 수 없습니다', HttpStatus.CONFLICT);
      }

      // 현재 라운드에 해당하는 시점의 idx
      const timeIdx = Math.min(
        Math.floor(getDateDistance(dayjs(stock.startedTime).toDate(), new Date()).minutes / stock.fluctuationsInterval),
        9,
      );

      const nextTimeIdx = timeIdx + StockConfig.ROUND_SKIP_STEP;

      if (user.money < StockConfig.DEFAULT_DRAW_COST) {
        throw new HttpException('잔액이 부족합니다', HttpStatus.CONFLICT);
      }

      const { companies } = stock;

      // 이미 정보를 가지고 있지 않은 회사들 중에서만 선택
      const availableCompanies = Object.entries(companies)
        .filter(([_, companyInfos]) => {
          // nextTimeIdx 이후의 모든 시점에서 정보를 가지고 있지 않은 회사만 선택
          return companyInfos.slice(nextTimeIdx).some((info) => !info.정보.includes(userId));
        })
        .map(([company]) => company);

      if (availableCompanies.length === 0) {
        throw new HttpException('더 이상 뽑을 수 있는 정보가 없습니다', HttpStatus.CONFLICT);
      }

      // 랜덤으로 회사 선택
      const randomIndex = Math.floor(Math.random() * availableCompanies.length);
      const selectedCompany = availableCompanies[randomIndex];

      // 랜덤으로 시점 선택 (정보를 가지고 있는 시점만 선택)
      let randomTimeIndex = Math.floor(Math.random() * (companies[selectedCompany].length - nextTimeIdx)) + nextTimeIdx;

      // 선택된 회사의 정보 업데이트
      const companyInfos = [...companies[selectedCompany]]; // 배열 복사

      // 해당 배열안에 이미 user Id가 있는지 확인
      let isExistUser = companyInfos[randomTimeIndex].정보.find((v) => v === userId);
      // user Id가 있는 때는 randomTimeIndex를 다시 생성
      while (isExistUser) {
        randomTimeIndex = Math.floor(Math.random() * (companies[selectedCompany].length - nextTimeIdx)) + nextTimeIdx;
        isExistUser = companyInfos[randomTimeIndex].정보.find((v) => v === userId);
      }

      companyInfos[randomTimeIndex] = {
        ...companyInfos[randomTimeIndex],
        정보: [...companyInfos[randomTimeIndex].정보, userId],
      };

      // 업데이트된 회사 정보로 객체 생성
      const updatedCompanies = { ...companies };
      updatedCompanies[selectedCompany] = companyInfos;

      // 스톡 정보 업데이트
      await this.stockRepository.findOneAndUpdate(stockId, {
        companies: updatedCompanies,
      });

      // 사용자 정보 업데이트
      await this.userRepository.findOneAndUpdate(
        { stockId, userId },
        {
          lastActivityTime: dayjs().toISOString(),
          money: user.money - StockConfig.DEFAULT_DRAW_COST,
        },
      );

      // 최종 정보 반환
      return this.stockRepository.findOneById(stockId);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async allUserSellStock(stockId: string): Promise<StockSchemaWithId | null> {
    try {
      const stock = await this.stockRepository.findOneById(stockId);
      const users = await this.userRepository.find({ stockId });

      if (!stock) {
        throw new Error('stock not found');
      }

      if (!users || users.length === 0) {
        throw new Error('users not found');
      }

      const { companies, remainingStocks } = stock;

      const idx = Math.min(
        Math.floor(getDateDistance(dayjs(stock.startedTime).toDate(), new Date()).minutes / stock.fluctuationsInterval),
        StockConfig.MAX_STOCK_IDX,
      );

      // 각 사용자의 주식 판매 처리
      for (const user of users) {
        let updatedMoney = user.money;
        let updatedStockStorages = [...user.stockStorages];

        // 사용자의 모든 주식 판매 처리
        updatedStockStorages = updatedStockStorages.map((stockStorage) => {
          const companyPrice = companies[stockStorage.companyName][idx]?.가격;
          const totalPrice = companyPrice * stockStorage.stockCountCurrent;

          // 사용자 잔액 증가
          updatedMoney += totalPrice;

          // 재고 업데이트
          const companyRemainingStock = remainingStocks[stockStorage.companyName] || 0;
          remainingStocks[stockStorage.companyName] = companyRemainingStock + stockStorage.stockCountCurrent;

          // 주식 보유량 이력 업데이트
          const updatedStockCountHistory = [...stockStorage.stockCountHistory];
          updatedStockCountHistory[idx] -= stockStorage.stockCountCurrent;

          return {
            ...stockStorage,
            stockCountCurrent: 0,
            stockCountHistory: updatedStockCountHistory,
          };
        });

        // 대출금 상환
        const loanMoney = user.loanCount * StockConfig.SETTLE_LOAN_PRICE;
        updatedMoney -= loanMoney;

        user.resultByRound = user.resultByRound ?? [];
        for (let i = 0; i < stock.round; i++) {
          if (typeof user.resultByRound[i] !== 'number') {
            user.resultByRound[i] = null;
          }
        }
        user.resultByRound[stock.round] = updatedMoney;

        // 사용자 정보 업데이트
        await this.userRepository.findOneAndUpdate(
          { stockId, userId: user.userId },
          {
            loanCount: 0,
            money: updatedMoney,
            resultByRound: user.resultByRound,
            stockStorages: updatedStockStorages,
          },
        );
      }

      // 재고 정보 업데이트
      return this.stockRepository.findOneAndUpdate(stockId, {
        remainingStocks,
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async deleteStock(stockId: string): Promise<boolean> {
    try {
      // 관련된 데이터 모두 삭제
      await this.userService.removeAllUser(stockId);
      await this.stockRepository.deleteMany({ _id: stockId });

      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async setStockPhase(stockId: string, phase: StockPhase): Promise<StockSchemaWithId | null> {
    if (phase === 'INTRO_RESULT') {
      await this.userService.alignIndexByOpenAI(stockId);
    }
    return this.stockRepository.findOneAndUpdate(stockId, { stockPhase: phase });
  }
}
