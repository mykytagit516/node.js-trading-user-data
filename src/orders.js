import {
  Exchanges,
  Members,
  Orders,
  OrderTickets,
  OrderTicketUserSettings,
  Accounts,
} from '@bct/trading-zoo-node-models';
import { mapSeries } from 'bluebird';

import { settingsToResponse } from './accounts';

const ordStatus = {
  Filled: 'FILLED',
  Canceled: 'CANCELED',
  Rejected: 'REJECTED',
  Open: 'OPEN',
  Created: 'OPEN',
  _: 'UNKNOWN',
};
const ordType = {
  market: 'MARKET',
  limit: 'LIMIT',
  _: 'UNKNOWN',
};
const ordSide = {
  B: 'Buy',
  S: 'Sell',
  C: 'Sell', // special 'conversion' case
  _: 'UNKNOWN',
};

/**
 * @param Member {Members}
 * @param OrderTicketId {number || null}
 * @param Skip {number || 0}
 * @param Limit {number || 50}
 * @returns {Promise<{Exchange, Symbol}>}
 */
const clientOrdersHistory = async (Member, OrderTicketId, Skip = 0, Limit = 50) => {
  const query = {
    where: {
      member_id: Member.id,
      level: Member.level,
    },
    attributes: [
      'ask',
      'bid',
      'total',
      'price',
      'created_at',
      'filled_size',
      'original_size',
      'last_state',
      'ord_type',
      'side',
      'order_ticket_id',
    ],
    include: [
      {
        model: Exchanges,
        as: 'exchange',
        attributes: [
          'id',
          'name',
        ],
      },
    ],
    raw: true,
    offset: Skip,
    limit: Limit,
    order: [
      ['created_at', 'DESC'],
    ],
  };

  if (OrderTicketId) {
    query.where.order_ticket_id = OrderTicketId;
  }

  return Orders.findAll(query)
    .map(order => {
      return {
        Exchange: order['exchange.name'],
        Symbol: `${order.ask.toUpperCase()}-${order.bid.toUpperCase()}`,
        Amount: order.total,
        Price: order.price,
        SentTime: order.created_at,
        AmountFilled: order.filled_size,
        Size: order.original_size,
        Status: ordStatus[order.last_state] || ordStatus._,
        Type: ordType[order.ord_type] || ordType._,
        Message: '',
        Side: ordSide[order.side] || ordSide._,
        TicketId: order.order_ticket_id,
      };
    });
};

const clientOrderTickets = async (ClientId, Skip, Limit) => {
  const member = await Members.findBySn(ClientId);
  if (!member) {
    throw new Error(`Cannot find member by sn=${ClientId}`);
  }

  const query = {
    where: {
      member_id: member.id,
      level: member.level,
    },
    attributes: [
      'id',
      'bid',
      'ask',
      'side',
      'price',
      'volume',
      'origin_volume',
      'fee',
      'total',
      'ord_type',
      'created_at',
      'funds_received',
      'c1_balance_before',
      'c1_balance_after',
      'c2_balance_before',
      'c2_balance_after',
      'store_credit_amount_before',
      'store_credit_amount_after',
    ],
    offset: Skip || 0,
    limit: Limit || 50,
    order: [
      ['created_at', 'DESC'],
    ],
    include: [
      {
        model: OrderTicketUserSettings,
        as: 'order_ticket_user_settings',
      },
    ],
  };

  const orderTickets = await OrderTickets.findAll(query);

  const accountsQueryWhere = {
    member_id: member.id,
    level: member.level,
  };

  const foundBctAccount = await Accounts.findOne({ where: Object.assign(accountsQueryWhere, { currency_id: 'bct' }) });
  const BctAmount = foundBctAccount ? foundBctAccount.balance : 0;

  return mapSeries(orderTickets, async orderTicket => {
    const {
      id,
      bid,
      ask,
      side,
      price,
      volume,
      origin_volume: originVolume,
      ord_type: orderTicketOrdType,
      created_at: createdAt,
      funds_received: fundsReceived,
      c1_balance_before: C1BeforePosition,
      c1_balance_after: C1AfterPosition,
      c2_balance_before: C2BeforePosition,
      c2_balance_after: C2AfterPosition,
      store_credit_amount_before: StoreCreditAmountBefore,
      store_credit_amount_after: StoreCreditAmountAfter,
      order_ticket_user_settings: userSettings,
    } = orderTicket;

    const orders = await clientOrdersHistory(member, id);

    const formattedSettings = settingsToResponse(userSettings);
    formattedSettings.accessLevel = `Level ${formattedSettings.accessLevel}`;

    return {
      Exchange: null,
      Symbol: `${ask.toUpperCase()}-${bid.toUpperCase()}`,
      Amount: null,
      Price: price,
      SentTime: createdAt,
      AmountFilled: volume,
      Size: originVolume,
      Status: null,
      Type: ordType[orderTicketOrdType] || ordType._,
      Message: '',
      Side: ordSide[side] || ordSide._,
      TicketId: id,
      ConversionAmount: fundsReceived,
      BctAmount,
      C1BeforePosition,
      C1AfterPosition,
      C2BeforePosition,
      C2AfterPosition,
      StoreCreditAmountBefore,
      StoreCreditAmountAfter,
      UserSettings: {
        ...formattedSettings,
      },
      Orders: orders,
    };
  });
};

export {
  clientOrdersHistory,
  clientOrderTickets,
};
