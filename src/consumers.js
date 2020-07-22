import { consume } from './amqp';
import {
  orderHistoryRequest,
  positionRequest,
  coinsRequest,
  coinsRequest2,
  coinsForWallet,
  exchangesForMarket,
  completeHistoryForCoin,
  resetClientBalancesRequest,
  nextLevelDetalization,
  getSettings,
  updateSettings,
  paymentRequest,
  saveMemberExchangesRequest,
  depositAddressRequest,
  telegramIdRequest,
  handleUpdatingUserBalancesRequest,
  handleEditMemberInformationRequest,
  handleGetMemberInformationRequest,
} from './handlers';

export const init = async () => {
  await consume('BCT.exchange.OrderHistoryRequest', orderHistoryRequest, { queue: 'orders-history-request' });
  await consume('BCT.exchange.PositionRequest', positionRequest, { queue: 'position-request' });
  await consume('BCT.exchange.CoinsRequest', coinsRequest, { queue: 'coins-request' });
  await consume('BCT.exchange.CoinsRequest2', coinsRequest2, { queue: 'coins-request-2' });
  await consume('BCT.exchange.CoinsForWalletRequest', coinsForWallet, { queue: 'coins-for-wallet-request' });
  await consume('BCT.exchange.ExchangesForMarketRequest', exchangesForMarket, { queue: 'exchanges-for-market-request' });
  await consume('BCT.exchange.HistoryForCoinRequest', completeHistoryForCoin, { queue: 'history-for-coin-request' });
  await consume('BCT.exchange.ResetDemoBalancesRequest', resetClientBalancesRequest, { queue: 'reset-balances-request' });
  await consume('BCT.exchange.NextLevelDetalizationRequest', nextLevelDetalization, { queue: 'next-level-detalization-request' });
  await consume('BCT.exchange.DepositAddressRequest', depositAddressRequest, { queue: 'deposit-address-request' });
  await consume('BCT.exchange.TelegramIdRequest', telegramIdRequest, { queue: 'telegram-id-request' });
  await consume('BCT.exchange.UpdateSettingsRequest', updateSettings, { queue: 'update-settings-request' });
  await consume('BCT.exchange.SettingsRequest', getSettings, { queue: 'settings-request' });
  await consume('BCT.exchange.PaymentRequest', paymentRequest, { queue: 'payment-request' });
  await consume('BCT.exchange.SaveMemberExchangesRequest', saveMemberExchangesRequest, { queue: 'save-exchange-keys-request' });
  await consume('BCT.exchange.UpdateUserBalancesRequest', handleUpdatingUserBalancesRequest, { queue: 'update-user-balances-request' });
  await consume('BCT.exchange.EditMemberInformationRequest', handleEditMemberInformationRequest, { queue: 'node-edit-member-information-request', exch: 'topic' });
  await consume('BCT.exchange.GetMemberInformationRequest', handleGetMemberInformationRequest, { queue: 'node-get-member-information-request', exch: 'topic' });
};
