import { useQuery } from 'lib-react-query';
import { PartySchemaWithId } from 'shared~type-party';
import { serverApiUrl } from '../../../config/baseUrl';

const useQueryParty = (
  partyId: string | undefined,
  options: Parameters<typeof useQuery<PartySchemaWithId>>[0]['reactQueryOption'] = {},
) => {
  const { data, error } = useQuery<PartySchemaWithId>({
    api: {
      hostname: serverApiUrl,
      method: 'GET',
      pathname: `/party/query/${partyId}`,
    },
    reactQueryOption: {
      enabled: !!partyId,
      refetchInterval: 1500,
      ...options,
    },
  });

  if (data && 'statusCode' in data && 'message' in data) {
    return { data: undefined, error: data };
  }

  return { data, error };
};

export default useQueryParty;
