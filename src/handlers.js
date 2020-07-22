import { buildLogger } from '@bct/b-logger';
import { db } from '@bct/trading-zoo-node-models';

import { publish } from './amqp';
import { coinsWithSymbols, coinsSimpleList, getCoinsForWallet } from './coins';
import { clientOrderTickets } from './orders';
import {
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
} from './accounts';
import { marketExchanges } from './exchanges';
import { createUserPayment } from './payments';
import { updateUserBalances } from './balances';
import { editMemberInformation, getMemberInformation } from './profiles';

const logger = buildLogger('handlers');

export const orderHistoryRequest = async data => {
  try {
    const { ClientId, Skip, Limit } = JSON.parse(data.content.toString());

    const orders = await clientOrderTickets(ClientId, Skip, Limit);

    await publish('BCT.exchange.OrderHistoryResponse', JSON.stringify({
      ClientId,
      Response: orders,
    }));
  } catch (err) {
    logger.error(err, 'Error in orderHistoryRequest');
  }
};

export const resetClientBalancesRequest = async data => {
  try {
    const { ClientId } = JSON.parse(data.content.toString());

    logger.warn(JSON.parse(data.content.toString()), 'resetClientBalancesRequest');

    const updated = await resetClientBalances(ClientId);
    logger.warn(!!updated, 'resetClientBalancesRequest --->>>> Reset result');

    if (updated) {
      const positions = await clientPositions(ClientId);

      await publish('BCT.exchange.PositionResponse', JSON.stringify({
        ClientId,
        Response: positions,
      }));

      // await publish('BCT.exchange.ResetUserBillsRequest', JSON.stringify({
      //   ClientId,
      // }), { exch: 'topic' });

      await publish('BCT.exchange.PortfolioResetRequest', JSON.stringify({
        ClientId,
      }), { exch: 'topic' });

      await publish('BCT.exchange.StartAutoDepositRequest', JSON.stringify({
        ClientId,
      }), { exch: 'topic' });
    }
  } catch (err) {
    logger.error(err, 'Error in resetClientBalancesRequest');
  }
};

export const positionRequest = async msg => {
  const content = msg.content.toString();
  try {
    const data = JSON.parse(content);
    logger.debug({ data }, 'Received msg [positionRequest]');
    const { ClientId } = data;

    const positions = await clientPositions(ClientId);

    await publish('BCT.exchange.PositionResponse', JSON.stringify({
      ClientId,
      Response: positions,
    }));
  } catch (err) {
    logger.error(err, 'Error in positionRequest');
  }
};

export const coinsRequest = async data => {
  try {
    const { Coin, ProgramId } = JSON.parse(data.content.toString());

    const coins = await coinsSimpleList(Coin);

    await publish('BCT.exchange.CoinsResponse', JSON.stringify({
      ProgramId,
      Coins: coins,
    }));
  } catch (err) {
    logger.error(err, 'Error in coinsRequest');
  }
};

export const coinsRequest2 = async data => {
  try {
    const { Coin, SocketId } = JSON.parse(data.content.toString());

    const coins = await coinsWithSymbols(Coin);
    // coins.sort((a, b) => b[2] - a[2]);

    await publish('BCT.exchange.CoinsResponse2', JSON.stringify({
      SocketId,
      Coins: coins,
    }));
  } catch (err) {
    logger.error(err, 'Error in coinsRequest2');
  }
};

export const coinsForWallet = async data => {
  try {
    const { SocketId } = JSON.parse(data.content.toString());

    const coins = await getCoinsForWallet();

    await publish('BCT.exchange.CoinsForWalletResponse', JSON.stringify({
      SocketId,
      Coins: coins,
    }));
  } catch (err) {
    logger.error(err, 'Error in coinsForWallet');
  }
};

export const exchangesForMarket = async data => {
  try {
    const { SocketId, Market } = JSON.parse(data.content.toString());

    const exchanges = await marketExchanges(Market);

    await publish('BCT.exchange.ExchangesForMarketResponse', JSON.stringify({
      SocketId,
      Exchanges: exchanges,
    }));
  } catch (err) {
    logger.error(err, 'Error in coinsForExchanges');
  }
};

export const completeHistoryForCoin = async data => {
  try {
    const {
      ClientId, Coin, Limit, Skip,
    } = JSON.parse(data.content.toString());

    let limit = Number(Limit || 50);
    if (limit > 100) {
      limit = 100;
    }
    let offset = Number(Skip || 0);
    if (offset < 0) {
      offset = 0;
    }
    const history = await clientCompleteHistoryByCurrency(ClientId, Coin.toLowerCase(), limit, offset);

    await publish('BCT.exchange.HistoryForCoinResponse', JSON.stringify({
      ClientId,
      Response: history,
    }));
  } catch (err) {
    logger.error(err, 'Error in completeHistoryForCoin');
  }
};

export const nextLevelDetalization = async data => {
  try {
    const {
      ClientId, ElementId, Type, RequestId,
    } = JSON.parse(data.content.toString());

    const nextLevelEntries = await getElementNextLevelDetalization(ClientId, Type, ElementId);

    await publish('BCT.exchange.NextLevelDetalizationResponse', JSON.stringify({
      ClientId,
      Response: {
        Type,
        ElementId,
        RequestId,
        Entries: nextLevelEntries,
      },
    }));
  } catch (err) {
    logger.error(err, 'Error in nextLevelDetalization');
  }
};

export const getSettings = async data => {
  try {
    const { ClientId } = JSON.parse(data.content.toString());

    const settings = await clientSettings(ClientId);

    const exchanges = await getMemberExchanges(ClientId);

    await publish('BCT.exchange.SettingsResponse', JSON.stringify({
      ClientId,
      Response: {
        Settings: settings,
        Exchanges: exchanges,
      },
    }));
  } catch (err) {
    logger.error(err, 'Error in getSettings');
  }
};

export const updateSettings = async data => {
  try {
    const { ClientId, Settings } = JSON.parse(data.content.toString());

    const settings = await updateClientSettings(ClientId, Settings);

    await publish('BCT.exchange.UpdateSettingsResponse', JSON.stringify({
      ClientId,
      Response: settings,
    }));
  } catch (err) {
    logger.error(err, 'Error in updateSettings');
  }
};

export const paymentRequest = async data => {
  const { ClientId, Payment } = JSON.parse(data.content.toString());

  try {
    const coupon = await createUserPayment(ClientId, Payment);

    await publish('BCT.exchange.PaymentResponse', JSON.stringify({
      ClientId,
      Response: {
        Coupon: coupon,
      },
    }));
  } catch (err) {
    await publish('BCT.exchange.PaymentResponse', JSON.stringify({
      ClientId,
      Response: {
        Error: err.message,
      },
    }));
  }
};

export const saveMemberExchangesRequest = async data => {
  try {
    const { ClientId, Exchange } = JSON.parse(data.content.toString());

    await createOrUpdateMemberExchanges(ClientId, Exchange);
  } catch (err) {
    logger.error(err, 'Error in saveExchangeKeysRequest');
  }
};

export const depositAddressRequest = async data => {
  try {
    const { ClientId, Address } = JSON.parse(data.content.toString());

    const result = await findUserData(ClientId, Address);
    let response;
    if (!result) {
      response = Object.assign({}, {
        Status: 'failed',
        Msg: 'No user exists with such deposit address',
      });
    } else {
      response = Object.assign({}, result, {
        Status: 'success',
      });
    }

    await publish('BCT.exchange.DepositAddressResponse', JSON.stringify({
      ClientId,
      Response: response,
    }));
  } catch (err) {
    logger.error(err, 'Error in depositAddressRequest');
  }
};

export const telegramIdRequest = async data => {
  try {
    const { ClientId, TelegramId } = JSON.parse(data.content.toString());

    const result = await findUsername(ClientId, TelegramId);
    let response;
    if (!result) {
      response = Object.assign({}, {
        Status: 'failed',
        Msg: 'Invalid TelegramID, please check number',
      });
    } else {
      response = Object.assign({}, result, {
        Status: 'success',
      });
    }

    await publish('BCT.exchange.TelegramIdResponse', JSON.stringify({
      ClientId,
      Response: response,
    }));
  } catch (err) {
    logger.error(err, 'Error in telegramIdRequest');
  }
};

/**
 * @param data
 * @param data.ClientId {String}
 * @param data.IsCreated {Boolean}
 * @param data.IsReset {Boolean}
 * @returns {Promise<void>}
 */
export const handleUpdatingUserBalancesRequest = async data => {
  try {
    const { ClientId, IsCreated, IsReset } = JSON.parse(data.content.toString());
    const Member = await db.Members.findBySn(ClientId);
    if (!Member) {
      throw new Error(`Member was not found by sn:${ClientId}`);
    }

    await updateUserBalances(Member, IsCreated, IsReset);
  } catch (err) {
    logger.error(err, 'Error in handleUpdatingUserBalancesRequest');
  }
};

/**
 * @param data {Object}
 * @param data.ClientId {String}
 * @param data.FirstName {String}
 * @param data.Fullname {String}
 * @param data.LastName {String}
 * @param data.PhotoUrl {String}
 * @param data.Username {String}
 * @returns {Promise<void>}
 */
export const handleEditMemberInformationRequest = async data => {
  try {
    const {
      ClientId,
      FirstName,
      Fullname,
      LastName,
      PhotoUrl,
      Username,
    } = JSON.parse(data.content.toString());

    const userData = {
      FirstName,
      Fullname,
      LastName,
      PhotoUrl,
      Username,
    };
    const Response = await editMemberInformation(ClientId, userData);

    await publish('BCT.exchange.EditMemberInformationResponse', JSON.stringify({
      ClientId,
      Response,
    }), { exch: 'topic' });
  } catch (err) {
    logger.error(err, 'Error in handleEditMemberInformationRequest');
  }
};

/**
 * @param data {Object}
 * @param data.ClientId {String}
 * @returns {Promise<void>}
 */
export const handleGetMemberInformationRequest = async data => {
  try {
    const { ClientId } = JSON.parse(data.content.toString());

    const Response = await getMemberInformation(ClientId);

    await publish('BCT.exchange.GetMemberInformationResponse', JSON.stringify({
      ClientId,
      Response,
    }), { exch: 'topic' });
  } catch (err) {
    logger.error(err, 'Error in handleGetMemberInformationRequest');
  }
};
