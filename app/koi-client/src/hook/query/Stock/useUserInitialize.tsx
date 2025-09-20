import { useMutation } from 'lib-react-query';
import { serverApiUrl } from '../../../config/baseUrl';

const useUserInitialize = (stockId: string | undefined) => {
  return useMutation<object, boolean>({
    api: {
      hostname: serverApiUrl,
      method: 'POST',
      pathname: `/stock/user/initialize?stockId=${stockId}`,
    },
  });
};

export default useUserInitialize;
