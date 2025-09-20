import { useMutation } from 'lib-react-query';
import { Request, Response } from 'shared~type-stock';
import { serverApiUrl } from '../../../config/baseUrl';

const useInitStock = (stockId: string | undefined) => {
  return useMutation<Request.PostStockInit, Response.Stock>({
    api: {
      hostname: serverApiUrl,
      method: 'POST',
      pathname: `/stock/init?stockId=${stockId}`,
    },
  });
};

export default useInitStock;
