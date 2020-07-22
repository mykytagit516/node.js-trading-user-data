/* eslint-disable camelcase */
import {
  Accounts,
  Currencies,
  Members,
  Orders,
  OrderEvents,
  OrderTickets,
  OrderTicketUserSettings,
  UserHistory,
  UserBorrows,
  Arbitrages,
  ArbitrageOrders,
  ArbitrageOrderEvents,
  PortfolioSnapshots,
  Notifications,
  TelegramTransfers,
  MemberExchanges,
  Exchanges,
  UserTransfers,
  ProcessingTasks,
  db,
} from '@bct/trading-zoo-node-models';
import { buildLogger } from '@bct/b-logger';
import Sequelize from 'sequelize';
import config from 'config';
import {get} from './http';

import { ElementNextLevelProvider } from './detalization';
import { updateUserBalances } from './balances';

const { Op } = Sequelize;
const logger = buildLogger('accounts');

const MEMBER_LEVEL_DEMO = 0;

/**
 * @param ClientId
 * @returns {Promise<{Coin, Position}>}
 */
const clientPositions = async ClientId => {
  const member = await Members.findBySn(ClientId);
  if (!member) {
    return [];
  }

  const userSettings = await member.find_or_create_settings({});
  const { short_selling: shortSelling } = userSettings;

  const query = {
    attributes: ['currency_id', 'balance'],
    where: {
      balance: {
        [Sequelize.Op.gt]: 0,
      },
      member_id: member.id,
      level: member.level,
    },
    include: [
      {
        attributes: ['market_cap', 'price_usd', 'significant_decimals'],
        model: Currencies,
        as: 'currency',
      },
    ],
    order: [
      [Sequelize.literal('"currency"."id" != \'bct\'')],
      [Sequelize.literal('"Accounts"."balance" * "currency"."price_usd"'), 'DESC'],
      [{ model: Currencies, as: 'currency' }, 'total_volume24_usd', 'DESC'],
      [{ model: Currencies, as: 'currency' }, 'market_cap', 'DESC'],
    ],
  };

  const results = await Accounts.findAll(query);
  const balances = await Promise.all(results.map(async account => {
    let position = Number(account.balance);
    let conversion = 1;
    if (account.currency_id === 'bct') {
      position = -position;
    } else if (account.currency_id !== 'f:usd' && account.balance) {
      conversion = Number(await get(config.conversion.url, {fsym: account.currency_id, tsym: 'f:usd'}));
    }

    return {
      Coin: account.currency_id.toUpperCase(),
      // Position: Number(Number(account.balance).toFixed(account.currency.significant_decimals)),
      Position: position,
      AmountUsd: Number((position * conversion).toFixed(account.currency.significant_decimals)),
    };
  }));

  if (!shortSelling) {
    return balances.filter(item => item.Coin !== 'BCT');
  }
  return balances;
};

/**
 * @param ClientId {String}
 * @param Coin {String}
 * @param limit
 * @param offset
 * @returns {Promise<*>}
 */
const clientCompleteHistoryByCurrency = async (ClientId, Coin) => {
  const member = await Members.findBySn(ClientId);

  if (!member) {
    return [];
  }

  const history = await UserHistory.findAll({
    where: {
      member_id: member.id,
      level: member.level,
      [Op.or]: [
        {
          from_unit: Coin,
        },
        {
          to_unit: Coin,
        },
      ],
    },
    raw: true,
  });

  return history
    .map(entry => {
      const {
        type,
        from: frm,
        from_value,
        from_unit,
        to,
        to_value,
        to_unit,
        ts,
      } = entry;

      return {
        type,
        from: {
          name: frm,
          value: from_value,
          unit: from_unit,
        },
        to: {
          name: to,
          value: to_value,
          unit: to_unit,
        },
        ts,
      };
    });
};

/**
 * @param ClientId {String}
 * @returns {Promise<*>}
 */
const resetClientBalances = async ClientId => {
  const member = await Members.findBySn(ClientId);
  if (!member || member.level !== MEMBER_LEVEL_DEMO) {
    return null;
  }

  await updateUserBalances(member, false, true);

  return Members.within_transaction(async transaction => {
    const resetQueryByOneProperty = {
      where: {
        member_id: member.id,
      },
      transaction,
    };
    await OrderEvents.destroy(resetQueryByOneProperty);
    await ArbitrageOrderEvents.destroy(resetQueryByOneProperty);
    await Notifications.destroy(resetQueryByOneProperty);

    const resetQuery = {
      where: {
        member_id: member.id,
        level: MEMBER_LEVEL_DEMO,
      },
      transaction,
    };

    await db.AutoConversionSettings.destroy(resetQueryByOneProperty);

    const autoConversion = await db.AutoConversions.findOne(resetQueryByOneProperty);
    if (autoConversion) {
      const { id: autoConversionId } = autoConversion;
      const autoConversionExecutionQuery = {
        where: {
          auto_conversion_id: autoConversionId,
        },
        transaction,
      };
      await db.AutoConversionExecutions.destroy(autoConversionExecutionQuery);
    }

    await db.AutoConversions.destroy(resetQueryByOneProperty);
    await db.AutoDeposits.destroy(resetQueryByOneProperty);

    await Orders.destroy(resetQuery);
    await OrderTickets.destroy(resetQuery);
    await OrderTicketUserSettings.destroy(resetQueryByOneProperty);

    await UserHistory.destroy(resetQuery);
    await UserBorrows.destroy(resetQuery);
    await ArbitrageOrders.destroy(resetQuery);
    await Arbitrages.destroy(resetQuery);
    await PortfolioSnapshots.destroy(resetQuery);

    await ProcessingTasks.destroy(resetQueryByOneProperty);
    await ProcessingTasks.destroy({
      where: {
        transfer_id: {
          [Op.in]: [
            Sequelize.literal(
              `SELECT id FROM user_transfers
              WHERE executor_member_id=${member.id} AND level=${MEMBER_LEVEL_DEMO}`
            ),
          ],
        },
      },
      transaction,
    });

    const userTransfersQuery = {
      where: {
        level: MEMBER_LEVEL_DEMO,
        [Sequelize.Op.or]: [
          {
            initiator_member_id: member.id,
          },
          {
            executor_member_id: member.id,
          },
        ],
      },
      transaction,
    };
    await UserTransfers.destroy(userTransfersQuery);

    const telegramTransfersQuery = {
      where: {
        level: MEMBER_LEVEL_DEMO,
        [Sequelize.Op.or]: [
          {
            from_member_id: member.id,
          },
          {
            to_member_id: member.id,
          },
        ],
      },
      transaction,
    };
    await TelegramTransfers.destroy(telegramTransfersQuery);
  });
};


const getElementNextLevelDetalization = async (ClientId, Type, ElementId) => {
  const member = await Members.findBySn(ClientId);

  if (!member) {
    return [];
  }

  const nextLevelProvider = ElementNextLevelProvider.get(Type);

  if (!nextLevelProvider) {
    return [];
  }

  return nextLevelProvider.get(ElementId, member);
};

const settingsTransformers = {
  language: v => v.toLowerCase(),
  currency: v => v.toLowerCase(),
  margin_trading: v => {
    const toNumber = +v;
    return toNumber > 0 ? toNumber : 0;
  },
};

const settingsToResponse = settings => {
  const {
    real_trading: realTrading,
    portfolio_includes_bct: portfolioIncludesBct,
    arbitrage_mode: arbitrageMode,
    auto_payback_bct: autoPaybackBct,
    private_vpn: privateVpn,
    short_selling: shortSelling,
    language,
    currency: defaultFiat,
    margin_trading: marginTrading,
    affiliate_link: affiliateLink,
    balance_includes_credit: balanceIncludesCredit,
    google_2fa: isGoogle2FA,
    store_credit: storeCredit,
    trading_history: tradingHistory,
    default_crypto: defaultCrypto,
    default_telegram: defaultTelegram,
    default_url: defaultUrl,
    auto_flip: autoFlip,
    c1,
    c2,
    default_crypto_amount: defaultCryptoAmount,
    is_auto_convert: isAutoConvert,
    is_default_crypto: isDefaultCrypto,
    is_exporting: isExporting,
    referred_by: referredBy,
    slider,
    swap,
    access_level: accessLevel,
    withdrawal_address: withdrawalAddress,
    withdrawal_address_currency_id: withdrawalAddressCurrencyId,
    referred_count: referredCount,
  } = settings || {};

  return {
    realTrading,
    portfolioIncludesBct,
    arbitrageMode,
    autoPaybackBct,
    privateVpn,
    shortSelling,
    language,
    defaultFiat,
    marginTrading,
    affiliateLink: affiliateLink || '',
    balanceIncludesCredit,
    isGoogle2FA,
    storeCredit,
    tradingHistory,
    defaultCrypto: defaultCrypto || '',
    defaultTelegram,
    defaultUrl: defaultUrl || '',
    autoFlip,
    c1,
    c2,
    defaultCryptoAmount,
    isAutoConvert,
    isDefaultCrypto,
    isExporting,
    referredBy,
    slider,
    swap,
    accessLevel,
    withdrawalAddress,
    withdrawalAddressCurrencyId,
    referredCount,
  };
};

const clientSettings = async ClientId => {
  const member = await Members.findBySn(ClientId);
  const settings = await member.find_or_create_settings({});
  return settingsToResponse(settings);
};

const updateClientSettings = async (ClientId, Settings) => {
  const member = await Members.findBySn(ClientId);
  const settings = await member.find_or_create_settings({});

  const {
    realTrading: real_trading,
    portfolioIncludesBct: portfolio_includes_bct,
    arbitrageMode: arbitrage_mode,
    autoPaybackBct: auto_payback_bct,
    privateVpn: private_vpn,
    shortSelling: short_selling,
    language,
    defaultFiat: currency,
    marginTrading: margin_trading,
    balanceIncludesCredit: balance_includes_credit,
    isGoogle2FA: google_2fa,
    storeCredit: store_credit,
    tradingHistory: trading_history,
    defaultCrypto: default_crypto,
    defaultTelegram: default_telegram,
    defaultUrl: default_url,
    autoFlip: auto_flip,
    c1,
    c2,
    defaultCryptoAmount: default_crypto_amount,
    isAutoConvert: is_auto_convert,
    isDefaultCrypto: is_default_crypto,
    isExporting: is_exporting,
    referredBy: referred_by,
    slider,
    swap,
    accessLevel: access_level,
    withdrawalAddress: withdrawal_address,
    withdrawalAddressCurrencyId: withdrawal_address_currency_id,

  } = Settings;

  const updateFields = {
    real_trading,
    portfolio_includes_bct,
    arbitrage_mode,
    auto_payback_bct,
    private_vpn,
    short_selling,
    language,
    currency,
    margin_trading,
    balance_includes_credit,
    google_2fa,
    store_credit,
    trading_history,
    default_crypto,
    default_telegram,
    default_url,
    auto_flip,
    c1,
    c2,
    default_crypto_amount,
    is_auto_convert,
    is_default_crypto,
    is_exporting,
    referred_by,
    slider,
    swap,
    access_level,
    withdrawal_address,
    withdrawal_address_currency_id,
  };

  const update = Object.keys(updateFields)
    .filter(field => typeof updateFields[field] !== 'undefined')
    .reduce((accum, curr) => {
      const fn = settingsTransformers[curr];
      const value = updateFields[curr];

      return {
        ...accum,
        [curr]: fn
          ? fn(value)
          : value,
      };
    }, {});

  if (!Object.keys(update)) {
    return settingsToResponse(settings);
  }

  const updatedSettings = await settings.update(update);

  return settingsToResponse(updatedSettings);
};

const getMemberExchanges = async ClientId => {
  const member = await Members.findBySn(ClientId);

  const memberExchangeQuery = {
    attributes: [
      'is_enabled',
    ],
    where: {
      member_id: member.id,
      deleted_at: null,
    },
    include: [
      {
        model: Exchanges,
        as: 'exchange',
        required: true,
        attributes: [
          'id',
          'name',
        ],
      },
    ],
  };

  const memberExchanges = await MemberExchanges.findAll(memberExchangeQuery);

  return memberExchanges.map(item => {
    const {
      exchange: {
        name,
        id,
      },
      is_enabled: isEnabled,
    } = item;

    return {
      id,
      name,
      active: Number(isEnabled),
    };
  });
};

const createOrUpdateMemberExchanges = async (ClientId, Exchange) => {
  const {
    apiKey,
    apiSecret,
    options,
    exchangeName,
  } = Exchange;

  const member = await Members.findBySn(ClientId);

  const exchangeQuery = {
    where: {
      name: {
        [Sequelize.Op.iLike]: `%${exchangeName}%`,
      },
    },
  };
  const exchange = await Exchanges.findOne(exchangeQuery);
  if (!exchange) {
    logger.error(`Exchange '${exchangeName}' is not found`);
    return;
  }

  let memberExchangeData = {
    api_key: apiKey,
    api_secret: apiSecret,
    options,
  };

  const memberExchangesQuery = {
    where: {
      member_id: member.id,
      exchange_id: exchange.id,
    },
  };

  const isFound = await MemberExchanges.findOne(memberExchangesQuery);
  if (!isFound) {
    memberExchangeData = Object.assign({}, memberExchangeData, {
      member_id: member.id,
      exchange_id: exchange.id,
    });

    await MemberExchanges.create(memberExchangeData);
  } else {
    await MemberExchanges.update(memberExchangeData, memberExchangesQuery);
  }
};

const findUserData = async () => {
  // TODO delete

  return {
    Username: 'jon_doe_12345',
    FirstName: 'jon',
    LastName: 'doe',
    PhotoUrl: 'https://t.me/i/userpic/320/jon_doe_12345.jpg',
  };
};

const findUsername = async () => {
  // TODO delete

  return {
    Username: 'jon_doe_12345',
  };
};

export {
  clientPositions,
  clientCompleteHistoryByCurrency,
  resetClientBalances,
  getElementNextLevelDetalization,
  clientSettings,
  updateClientSettings,
  getMemberExchanges,
  createOrUpdateMemberExchanges,
  findUserData,
  findUsername,
  settingsToResponse,
};
