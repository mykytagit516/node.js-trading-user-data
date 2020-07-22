import { db } from '@bct/trading-zoo-node-models';
import config from 'config';
import { buildLogger } from '@bct/b-logger';

const logger = buildLogger('handlers');

const { baseCurrency: BASE_CURRENCY } = config;

const MEMBER_LEVEL_DEMO = 0;
const BASE_CURRENCY_LOWER_CASE = BASE_CURRENCY.toLowerCase();

/**
 * @param member {db.Members}
 * @param isCreated {Boolean}
 * @param isReset {Boolean}
 * @returns {Promise<void>}
 */
const updateUserBalances = async (member, isCreated, isReset) => {
  await member.within_transaction(async transaction => {
    if (isCreated) {
      await member.assertAccount(BASE_CURRENCY_LOWER_CASE);
      await member.assertAccount('bch');
      await member.assertAccount('tusd');
    }

    if (isReset) {
      const resetAccountsData = {
        balance: 0,
        locked: 0,
        transfer_lock: 0,
      };
      const resetAccountsQuery = {
        where: {
          member_id: member.id,
          level: MEMBER_LEVEL_DEMO,
        },
        transaction,
      };
      await db.Accounts.update(resetAccountsData, resetAccountsQuery);
    }

    if (isCreated || isReset) {
      const baseAccountsData = {
        balance: 1,
        locked: 0,
      };
      const baseAccountsQuery = {
        where: {
          member_id: member.id,
          level: MEMBER_LEVEL_DEMO,
          currency_id: [BASE_CURRENCY_LOWER_CASE],
        },
        transaction,
      };
      logger.debug({ baseAccountsQuery }, 'reseting balances with');

      await db.Accounts.update(baseAccountsData, baseAccountsQuery);
    }
  });
};

export { updateUserBalances };
