/* eslint-disable camelcase */
import {
  Orders, OrderEvents,
  ArbitrageOrders, ArbitrageOrderEvents,
} from '@bct/trading-zoo-node-models';


const ElementNextLevelProvider = {
  providers: {},

  add(type, provider) {
    this.providers[type] = provider;
  },

  get(type) {
    return this.providers[type];
  },
};

function ElementNextLevel(type, nextLevelType, model, findQuery, toResponse) {
  this.type = type;
  this.nextLevelType = nextLevelType;
  this.model = model;
  this.findQuery = findQuery;
  this.toResponse = toResponse;
}

ElementNextLevel.prototype.get = async (elementId, member) => {
  const entries = await this.model.findAll({
    where: this.findQuery({ elementId, member }),
  }, {
    raw: true,
  });

  return entries
    .map(entry => {
      return {
        ...this.toResponse(entry),
        type: this.nextLevelType,
      };
    });
};


// orders

const orderToResponse = order => {
  const {
    id,
    side,
    price,
    filled_size,
    ord_type,
    created_at,
  } = order;

  return {
    id,
    side: side === 'B'
      ? 'Buy'
      : 'Sell',
    price,
    size: filled_size,
    orderType: ord_type === 'L'
      ? 'limit'
      : 'market',
    created_at,
  };
};

const orderFindQuery = ({ member, elementId }) => {
  return {
    order_ticket_id: elementId,
    member_id: member.id,
    level: member.level,
  };
};

// order_events

const orderEventToResponse = orderEvent => {
  const {
    id,
    filled_size,
    filled_price,
    state,
    total,
    created_at,
  } = orderEvent;

  return {
    id,
    filled_size,
    filled_price,
    state,
    total,
    created_at,
  };
};


const orderEventFindQuery = ({ member, elementId }) => {
  return {
    order_id: elementId,
    member_id: member.id,
  };
};


// arbitrage_order

const arbitrageOrderToResponse = order => {
  const {
    id,
    side,
    price,
    filled_size,
    ord_type,
    created_at,
  } = order;

  return {
    id,
    side: side === 'B'
      ? 'Buy'
      : 'Sell',
    price,
    size: filled_size,
    orderType: ord_type === 'L'
      ? 'limit'
      : 'market',
    created_at,
  };
};

const arbitrageOrderFindQuery = ({ member, elementId }) => {
  return {
    arbitrage_id: elementId,
    member_id: member.id,
    // level: member.level,
  };
};

// arbitrage_order_events

const arbitrageOrderEventToResponse = arbitrageOrderEvent => {
  const {
    id,
    filled_size,
    filled_price,
    state,
    total,
    created_at,
  } = arbitrageOrderEvent;

  return {
    id,
    filled_size,
    filled_price,
    state,
    total,
    created_at,
  };
};

const arbitrageOrderEventFindQuery = ({ member, elementId }) => {
  return {
    arbitrage_order_id: elementId,
    member_id: member.id,
  };
};


ElementNextLevelProvider.add(
  'order_ticket',
  new ElementNextLevel('order_ticket', 'order', Orders, orderFindQuery, orderToResponse)
);

ElementNextLevelProvider.add(
  'order',
  new ElementNextLevel('order', 'order_event', OrderEvents, orderEventFindQuery, orderEventToResponse)
);

ElementNextLevelProvider.add(
  'arbitrage',
  new ElementNextLevel(
    'arbitrage',
    'arbitrage_order',
    ArbitrageOrders,
    arbitrageOrderFindQuery,
    arbitrageOrderToResponse
  )
);

ElementNextLevelProvider.add(
  'arbitrage_order',
  new ElementNextLevel(
    'arbitrage_order',
    'arbitrage_order_event',
    ArbitrageOrderEvents,
    arbitrageOrderEventFindQuery,
    arbitrageOrderEventToResponse
  )
);

export { ElementNextLevelProvider };
