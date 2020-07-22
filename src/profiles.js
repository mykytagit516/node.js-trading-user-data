import { db } from '@bct/trading-zoo-node-models';

/**
 * @param member {db.Members}
 * @returns {
 * {Username: string | * | String | string | username | {defaultValue, allowNull, type},
 * FirstName: (first_name|{defaultValue, allowNull, type}|String),
 * Fullname: (*|fullname|{defaultValue, allowNull, type}),
 * PhotoUrl: string,
 * LastName: (last_name|{defaultValue, allowNull, type})}}
 */
const transformResponse = member => {
  return {
    FirstName: member.first_name,
    Fullname: member.fullname,
    LastName: member.last_name,
    PhotoUrl: member.photo_url,
    Username: member.username,
  };
};

/**
 * @param ClientId {String}
 * @param userData {Object}
 * @param userData.ClientId {String}
 * @param userData.FirstName {String}
 * @param userData.Fullname {String}
 * @param userData.LastName {String}
 * @param userData.PhotoUrl {String}
 * @param userData.Username {String}
 * @returns {Promise<{
 * Status: {Message: string, IsSuccess: boolean}}
 * | {
 *  Status: {Message: string, IsSuccess: boolean}
 *  MemberInformation: {
 *    Username: (username|{defaultValue, allowNull, type}),
 *    FirstName: (first_name|{defaultValue, allowNull, type}),
 *    Fullname: (fullname|{defaultValue, allowNull, type}),
 *    LastName: (last_name|{defaultValue, allowNull, type})
 *    PhotoUrl: string,
 *   }
 * }
 * >}
 */
const editMemberInformation = async (ClientId, userData) => {
  const member = await db.Members.findBySn(ClientId);
  if (!member) {
    return {
      Status: {
        IsSuccess: false,
        Message: 'Member was not found',
      },
    };
  }

  const transformProperties = {
    FirstName: 'first_name',
    Fullname: 'fullname',
    LastName: 'last_name',
    PhotoUrl: 'photo_url',
    Username: 'username',
  };

  const newMemberData = Object
    .keys(userData)
    .reduce((acc, item) => {
      if (transformProperties[item] && userData[item]) {
        const property = transformProperties[item];
        acc[property] = userData[item];
      }

      return acc;
    }, {});

  const updatedMember = Object.assign(member, newMemberData);
  const newDataMember = await updatedMember.save({ returning: true });

  return {
    Status: {
      IsSuccess: true,
      Message: 'Member was updated successfully',
    },
    MemberInformation: transformResponse(newDataMember),
  };
};

/**
 * @param ClientId {String}
 * @returns {Promise<{
 * Status: {Message: string, IsSuccess: boolean}}
 * |
 * {
 * Status: {IsSuccess: boolean},
 * MemberInformation: {
 *   Username: (string|username|{defaultValue, allowNull, type}|*|String),
 *   FirstName: (first_name|{defaultValue, allowNull, type}|String),
 *   Fullname: (fullname|{defaultValue, allowNull, type}|*),
 *   LastName: (last_name|{defaultValue, allowNull, type})}
 *  }>
 * }
 */
const getMemberInformation = async ClientId => {
  const member = await db.Members.findBySn(ClientId);
  if (!member) {
    return {
      Status: {
        IsSuccess: false,
        Message: 'Member was not found',
      },
    };
  }

  return {
    Status: {
      IsSuccess: true,
    },
    MemberInformation: transformResponse(member),
  };
};

export {
  editMemberInformation,
  getMemberInformation,
};
