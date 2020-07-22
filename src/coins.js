import Sequelize from 'sequelize';
import { Currencies, Markets } from '@bct/trading-zoo-node-models';

const { Op } = Sequelize;

/**
 * @deprecated
 * @param Coin {string} either '*' or quote coin
 * @returns {Promise<*>}
 */
const coinsSimpleList = Coin => {
  // if client sent '*' -- we need to respond with list of 'markets'
  // for instance, on big exchange there are few markets:
  //   eth, btc, usdt, usdc, xmr
  // all these are quote coins, in our db their are bid units
  const unit = Coin === '*' ? 'bid_unit' : 'ask_unit';

  const query = {
    attributes: [unit],
    raw: true,
    where: {
      is_enabled: true,
    },
    group: [unit],
  };

  // if client sent some coin, other than '*' -- we need to respond with
  // list of coins that could be traded on specified 'market'
  if (Coin !== '*') {
    query.where.bid_unit = Coin.toLowerCase();
  }

  return Markets.findAll(query)
    .map(coin => coin[unit].toUpperCase());
};


/**
 * @param fixedCoin {string|null} ignored
 * @param coin
 * @returns {[string, string, number]}
 */
const coinsListFormatQuoteCoin = (fixedCoin, coin) => {
  return [
    coin.currency.toUpperCase(),
    '',
    Number(coin.is_generating),
    Number(coin.price_usd),
    Number(coin.change24_usd),
    Number(coin.total_volume24_usd),
    Number(coin.market_cap),
    0, // default amount == arbitrage amount
    0, // max amount
    coin.coinname,
  ];
};

/**
 * @param fixedCoin {string} bind value of quote coin. used to build correct symbol
 * @param coin
 * @returns {[string, string, number]}
 */
const coinsListFormatBaseCoin = (fixedCoin, coin) => {
  if (coin.bid_unit.toUpperCase() === fixedCoin) {
    const c = coin.ask_unit.toUpperCase();
    return [
      c,
      `${c}-${fixedCoin}`,
      Number(coin['base_currency.is_generating']),
      Number(coin['base_currency.price_usd']),
      Number(coin['base_currency.change24_usd']),
      Number(coin['base_currency.total_volume24_usd']),
      Number(coin['base_currency.market_cap']),
      0.5, // default amount == arbitrage amount
      1, // max amount
      coin['base_currency.coinname'],
    ];
  }

  const c = coin.bid_unit.toUpperCase();
  return [
    c,
    `${fixedCoin}-${c}`,
    Number(coin['base_currency.is_generating']),
    Number(coin['base_currency.price_usd']),
    Number(coin['base_currency.change24_usd']),
    Number(coin['base_currency.total_volume24_usd']),
    Number(coin['base_currency.market_cap']),
    0.5, // default amount == arbitrage amount
    1, // max amount
    coin['base_currency.coinname'],
  ];
};

/**
 * @returns {Promise<Array{string}>}
 */
const getCoinsForWallet = () => {
  const formatter = coinsListFormatQuoteCoin.bind(null, '*');

  const query = {
    attributes: [
      ['id', 'currency'],
      'coinname',
      'market_cap',
      'price_usd',
      'change24_usd',
      'total_volume24_usd',
      'is_generating',
    ],
    order: [
      [Sequelize.literal('id != \'bct\'')],
      ['total_volume24_usd', 'DESC'],
      ['market_cap', 'DESC'],
    ],
    raw: true,
  };
  return Currencies.findAll(query)
    .then(result => result.map(formatter));
};

const listOfAllCoins = () => {
  const formatter = coinsListFormatQuoteCoin.bind(null, '*');

  const query = {
    attributes: [
      ['id', 'currency'],
      'coinname',
      'market_cap',
      'price_usd',
      'change24_usd',
      'total_volume24_usd',
      'is_generating',
    ],
    order: [
      [Sequelize.literal('id != \'bct\'')],
      ['total_volume24_usd', 'DESC'],
      ['market_cap', 'DESC'],
    ],
    where: {
      total_volume24_usd: {
        [Op.not]: null,
      },
    },
    raw: true,
  };
  return Currencies.findAll(query)
    .then(result => result.map(formatter));
};


/**
 * @param coin
 * @returns {Promise<Array>}
 */
const listOfCoinsForMarket = coin => {
  const query = {
    raw: true,
    attributes: ['ask_unit', 'bid_unit'],
    where: {
      is_enabled: true,
      [Op.or]: {
        ask_unit: coin.toLowerCase(),
        bid_unit: coin.toLowerCase(),
      },
    },
    include: [
      {
        model: Currencies,
        as: 'base_currency',
        attributes: [
          'is_generating',
          'market_cap',
          'price_usd',
          'change24_usd',
          'total_volume24_usd',
          'coinname',
        ],
      },
    ],
    order: [
      [Sequelize.literal('"base_currency"."id" != \'bct\'')],
      [Sequelize.col('"base_currency"."total_volume24_usd"'), 'DESC'],
      [Sequelize.col('"base_currency"."market_cap"'), 'DESC'],
    ],
    group: [
      Sequelize.col('"base_currency"."id"'),
      'ask_unit',
      'bid_unit',
      'market_cap',
      'price_usd',
      'change24_usd',
      'total_volume24_usd',
      'is_generating',
      'coinname',
    ],
  };

  const formatter = coinsListFormatBaseCoin.bind(null, coin.toUpperCase());

  return Markets.findAll(query)
    .map(formatter);
};

/**
 * @param coin {string} '*' or quote coin
 * @returns {Promise<Array>}
 */
const coinsWithSymbols = coin => {
  // if client sent '*' -- we need to respond with list of 'markets' - quote coins
  // for instance, on big exchange there are few markets:
  //   eth, btc, usdt, usdc, xmr
  // all these are quote coins, in our db their are bid units

  // if client sent some coin, other than '*' -- we need to respond with
  // list of coins that could be traded on specified 'market' - base coins
  if (coin === '*') {
    return listOfAllCoins(coin);
  }
  return listOfCoinsForMarket(coin);
};

export {
  coinsSimpleList,
  getCoinsForWallet,
  coinsWithSymbols,
  listOfAllCoins,
};
