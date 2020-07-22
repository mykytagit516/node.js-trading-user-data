import config from 'config';
import { encrypt } from '@bct/bct-crypto';
import fetch from 'node-fetch';
import { buildLogger } from '@bct/b-logger';
import {
  Currencies,
  Deposits,
  MemberCoupons,
  Members,
  UserPayments,
} from '@bct/trading-zoo-node-models';

import { publish } from './amqp';


const logger = buildLogger('payments');

const BCT_BONUS_AMOUNT = 1000;

const ENCRYPT_KEY = config.encryption.key;


/**
 * Get coupon from other backend
 * @param email
 * @param fullname
 * @returns {Promise.<*>}
 */
const getCoupon = async (email, fullname) => {
  const {
    aboutBctAPI: {
      url,
    },
  } = config;

  const body = {
    email,
    fullname,
  };
  const options = {
    method: 'post',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(`${url}api/coupons/generate`, options);
  const data = await response.json();

  return data;
};

const splitByChars = (str, len = 30) => {
  const chunksCount = Math.ceil(str.length / len);

  return (new Array(chunksCount)).fill('')
    .map((_ch, id) => {
      const start = len * id;
      return str.slice(start, start + len);
    });
};

export const createUserPayment = async (ClientId, Payment) => {
  const {
    Amount: amount,
    Coin: currencyId,
    PaymentAmount: paymentAmount,
    PaymentCurrency: paymentCurrency,
    Card: {
      Type: cardType,
      Name: cardName,
      Number: cardNumber,
      ExpDate: cardExpDate,
      Cvv: cardCvv,
    },
  } = Payment;

  const member = await Members.findBySn(ClientId);
  if (!member) {
    throw Error('Member not found.');
  }

  const currency = await Currencies.findByPk(currencyId.toLowerCase());
  if (!currency) {
    throw Error('Unsupported currency.');
  }

  // TODO: validate card data
  const cardData = {
    type: cardType,
    name: cardName,
    number: cardNumber,
    expired: cardExpDate,
    cvv: cardCvv,
  };

  const encryptedCardInfo = encrypt(JSON.stringify(cardData), ENCRYPT_KEY);

  const newPaymentData = {
    member_id: member.id,
    currency_id: currency.id,
    amount: +amount,
    payment_amount: +paymentAmount,
    payment_currency: paymentCurrency,
    card_info: encryptedCardInfo,
  };

  let coupon;

  try {
    await Members.within_transaction(async transaction => {
      const payment = await UserPayments.create(newPaymentData, { transaction });

      payment.card_info = splitByChars(payment.card_info, 30).join('\n');
      const telegramReport = {
        event: 'newPayment',
        type: 'telegram',
        data: {
          payment,
          member,
        },
      };
      await publish('BCT.exchange.NotificationRequest', JSON.stringify(telegramReport), { exch: 'topic' });

      const emailReport = {
        event: 'newPayment',
        type: 'email',
        data: {
          coin: currency.id,
          report: telegramReport,
          amount,
        },
      };
      await publish('BCT.exchange.NotificationRequest', JSON.stringify(emailReport), { exch: 'topic' });

      const depositsDataBCT = {
        member_id: member.id,
        currency_id: 'bct',
        amount: BCT_BONUS_AMOUNT,
        aasm_state: 'new',
        type: 'type', // ???
        tid: 'TID', // ???
      };
      const createdDeposit = await Deposits.create(depositsDataBCT, { transaction });

      const bctAccount = await member.get_account('bct', { transaction });

      // forcing manual update of balance since negative balance is ok for BCT
      bctAccount.balance -= BCT_BONUS_AMOUNT;
      bctAccount.save({ transaction });

      const userHistoryData = {
        type: 'deposit',
        memberId: member.id,
        sourceId: createdDeposit.id,
      };
      await publish('BCT.exchange.collectHistoryRequests', JSON.stringify(userHistoryData), {});

      const { coupon: memberCoupon } = await getCoupon(member.email, member.sn);
      coupon = memberCoupon;

      const memberCouponData = {
        member_id: member.id,
        coupon,
        status: 'new',
      };

      await MemberCoupons.create(memberCouponData, { transaction });
    });
  } catch (err) {
    logger.error(err);
    throw new Error('Internal error');
  }

  return coupon;
};
