import { getDateDistance } from '@toss/date';
import { objectEntries } from '@toss/utils';
import { Response } from 'shared~type-stock';
import { useQuery } from 'lib-react-query';
import { useMemo } from 'react';
import dayjs from 'dayjs';
import { serverApiUrl } from '../../../config/baseUrl';

interface Options {
  keepPreviousData?: boolean;
  refetchInterval?: number;
}

const useQueryStock = (stockId: string | undefined, options?: Options) => {
  const { data, refetch } = useQuery<Response.GetStock>({
    api: {
      hostname: serverApiUrl,
      method: 'GET',
      pathname: `/stock?stockId=${stockId}`,
    },
    reactQueryOption: {
      enabled: !!stockId,
      refetchInterval: 500,
      select: (data) => {
        // 새로운 객체를 생성하여 반환 (React Query의 immutability 원칙 준수)
        const newRemainingStocks = { ...data.remainingStocks };
        Object.entries(newRemainingStocks).forEach(([company, remainingStock]) => {
          if (remainingStock === null) {
            newRemainingStocks[company] = Infinity;
          }
        });

        return {
          ...data,
          maxPersonalStockCount: data.maxPersonalStockCount ?? Infinity,
          maxStockHintCount: data.maxStockHintCount ?? Infinity,
          remainingStocks: newRemainingStocks,
        };
      },
      ...options,
    },
  });

  const timeIdx = data?.startedTime
    ? Math.floor(getDateDistance(dayjs(data.startedTime).toDate(), new Date()).minutes / data.fluctuationsInterval)
    : undefined;

  const companiesPrice = useMemo(
    () =>
      data?.startedTime && timeIdx !== undefined
        ? objectEntries(data.companies).reduce((source, [company, companyInfos]) => {
            if (timeIdx > 9) {
              source[company] = companyInfos[9].가격;
              return source;
            }

            source[company] = companyInfos[timeIdx].가격;
            return source;
          }, {} as Record<string, number>)
        : {},
    [data?.companies, data?.startedTime, timeIdx],
  );

  return { companiesPrice, data, refetch, timeIdx };
};

export default useQueryStock;
