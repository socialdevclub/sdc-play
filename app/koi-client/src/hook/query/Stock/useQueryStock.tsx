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
      refetchInterval: 1500,
      select: (data) => {
        data.maxMarketStockCount = data.maxMarketStockCount ?? Infinity;
        data.maxPersonalStockCount = data.maxPersonalStockCount ?? Infinity;
        data.maxStockHintCount = data.maxStockHintCount ?? Infinity;
        Object.entries(data.remainingStocks).forEach(([company, remainingStock]) => {
          if (remainingStock === null) {
            data.remainingStocks[company] = Infinity;
          }
        });
        return data;
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
