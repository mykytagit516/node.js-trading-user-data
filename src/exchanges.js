import { Exchanges, Markets } from '@bct/trading-zoo-node-models';

/**
 * @param marketName {string} 'EOS-BTC'
 * @returns {Promise<Array{id: number, name: string}>}
 */
export const marketExchanges = async marketName => {
  const marketId = (marketName || '').replace(/[/|-|_]+/, '-', '').toLowerCase();
  if (!marketId) {
    return [];
  }

  const market = await Markets.findByPk(marketId);
  if (!market) {
    return [];
  }

  const marketLinkedExchanges = await market.getExchanges();
  const exchangeIds = marketLinkedExchanges.map(e => e.exchange_id);

  return Exchanges.findAll({
    attributes: ['id', 'name'],
    where: {
      id: exchangeIds,
    },
    order: [['name', 'ASC']],
    raw: true,
  });
};
