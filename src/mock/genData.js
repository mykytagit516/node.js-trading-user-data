import {
  exchanges, coins, custodians, coinsCodes,
} from './marketData';

const range = n => [...Array(n).keys()];

// Generic Utils

export const randSelectionFrList = options => {
  return options[Math.floor(Math.random() * options.length)];
};

export const genRandFloat = (lowRange, highRange, float) => {
  return (Math.random() * (highRange - lowRange) + lowRange).toFixed(float);
};

// Component Utils
export const genFilledOrders = numRows => {
  return range(numRows).map(() => {
    return {
      exchange: randSelectionFrList(exchanges),
      product: (`${randSelectionFrList(coins)}/${randSelectionFrList(coins)}`),
      size: genRandFloat(0, 1, 4),
      filled: genRandFloat(0, 1, 4),
      price: genRandFloat(0, 1000, 2),
      fee: genRandFloat(0, 0, 4),
      time: (`${genRandFloat(0, 59, 0)}M AGO`),
      orderStatus: randSelectionFrList(['FILLED', 'CANCELED']),
    };
  });
};

export const genTradeHistory = numRows => {
  return range(numRows).map(() => {
    return {
      time: '07.22.2019',
      pair: (`${randSelectionFrList(coins)}/${randSelectionFrList(coins)}`),
      type: randSelectionFrList(['Limit', 'Market']),
      price: genRandFloat(0, 1, 4),
      filled: genRandFloat(0, 1000, 2),
      fee: genRandFloat(0, 0, 4),
      total: genRandFloat(0, 100, 0),
    };
  });
};

export const genOpenOrders = numRows => {
  return range(numRows).map(() => {
    return {
      exchange: randSelectionFrList(exchanges),
      size: genRandFloat(0, 1, 4),
      price: genRandFloat(0, 1000, 2),
      fee: genRandFloat(0, 0, 4),
      time: (`${genRandFloat(0, 59, 0)}M AGO`),
      product: (`${randSelectionFrList(coins)}/${randSelectionFrList(coins)}`),
    };
  });
};

export const genOrderData = numRows => {
  return range(numRows).map(() => {
    return {
      price: genRandFloat(386, 392, 2),
      amount: genRandFloat(0, 99, 6),
      exchange: randSelectionFrList(exchanges),
    };
  });
};

export const genPortfolioData = numRows => {
  return range(numRows).map(() => {
    return {
      coin: randSelectionFrList(coins),
      '%': genRandFloat(100, 0, 0),
      size: genRandFloat(99, 0, 5),
      amount: genRandFloat(99, 0, 5),
      'days %': genRandFloat(99, 0, 2),
      exchange: randSelectionFrList(exchanges),
    };
  });
};

export const genPortfolioNewData = numRows => {
  return range(numRows).map(() => {
    return {
      coin: randSelectionFrList(coins),
      size: genRandFloat(1, 9, 4),
      amount: genRandFloat(10, 100, 2),
      custodian: randSelectionFrList(custodians),
    };
  });
};

export const genRecentTradesData = numRows => {
  return range(numRows).map(() => {
    return {
      price: genRandFloat(99, 0, 2),
      amount: genRandFloat(99, 0, 10),
      exchange: randSelectionFrList(exchanges),
      isBuy: randSelectionFrList([true, false]),
    };
  });
};

export const genLowestPriceExchangeData = numRows => {
  const lowestPriceExchangeData = [];
  let i = 0;
  for (i; i < numRows; i += 1) {
    lowestPriceExchangeData.push({
      exchange: randSelectionFrList(exchanges),
      toAmt: 1,
      toCoin: 'ETH',
      fromAmt: genRandFloat(0.14, 0.15, 2),
      fromCoin: 'USDT',
    });
  }
  return lowestPriceExchangeData;
};


export const genOrderHistory = (numRows, pref = 0) => {
  return range(numRows).map((_v, i) => {
    return {
      Exchange: randSelectionFrList(exchanges),
      Symbol: (`${randSelectionFrList(coins)}/${randSelectionFrList(coins)}`),
      Amount: genRandFloat(99, 0, 10),
      Price: genRandFloat(99, 0, 2),
      SentTime: new Date(),
      AmountFilled: genRandFloat(0, 0, 4),
      Size: genRandFloat(0, 0, 4),
      Status: randSelectionFrList(['FILLED', 'CANCELED', 'REJECTED', 'OPEN']),
      Type: randSelectionFrList(['MARKET', 'LIMIT']),
      Message: '',
      Side: randSelectionFrList(['Buy', 'Sell']),
      TicketId: i + pref,
    };
  });
};


export const genPositions = numRows => {
  const positions = range(numRows).map(() => {
    return {
      Coin: randSelectionFrList(coinsCodes),
      Position: genRandFloat(99, 0, 10),
    };
  });
  const u = positions.reduce((a, c) => {
    a[c.Coin] = (a[c.Coin] || 0) + (+c.Position);
    return a;
  }, {});

  return Object.keys(u)
    .map(k => ({
      Coin: k,
      Position: u[k],
    }));
};
